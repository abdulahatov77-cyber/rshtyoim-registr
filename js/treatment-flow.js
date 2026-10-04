// Admission-grain paths. The RPC returns aggregate counts only, under the caller's RLS.
const TreatmentFlow = {
  states: {}, epoch: 0,
  text(value) { return typeof I18n !== 'undefined' ? I18n.translateText(value) : value; },
  number(value) { return typeof I18n !== 'undefined' ? I18n.formatNumber(value) : String(value); },
  label(value) {
    const labels = {
      __unknown__: 'Qayd etilmagan', __other__: 'Boshqa / eski nomdagi muolaja',
      __subtype_unknown__: 'Kasallik turi qayd etilmagan',
      __none__: 'Dinamik yozuv yo‘q', __end__: 'Keyingi muolaja qayd etilmagan',
      __ambiguous__: 'Karta bog‘lanishi noaniq', __active__: 'Davolanmoqda', __worse__: 'Yomonlashib chiqarildi',
      __routed__: 'Muolaja o‘rniga yo‘naltirish qaydi',
      __route_angio__: 'Angiografiya va endovaskulyar muolaja uchun',
      __route_mskt__: 'MSKT (tekshiruv) uchun', __route_stable__: 'Stabillashgandan so‘ng davolash uchun',
      __route_other__: 'Boshqa sabab', __route_unknown__: 'Sababi qayd etilmagan'
    };
    return this.text(labels[value] || value);
  },
  isRoute(value) { return String(value).startsWith('__route_'); },
  subtype(row) { return row.subtype || '__subtype_unknown__'; },
  isNonTreatment(value) { return value==='MSKT angiografiya' || ['__other__','__routed__','__not_performed__'].includes(value) || this.isRoute(value); },
  supplementary(rows) {
    const result={diagnosticInitial:0,diagnosticDynamic:0,notPerformed:0,unclassified:0,routes:new Map()};
    for(const row of rows) {
      const entries=[row.initial,...row.dynamics];
      if(row.initial==='MSKT angiografiya') result.diagnosticInitial+=row.n;
      result.diagnosticDynamic+=row.dynamics.filter(v=>v==='MSKT angiografiya').length*row.n;
      result.notPerformed+=entries.filter(v=>v==='__not_performed__').length*row.n;
      result.unclassified+=entries.filter(v=>v==='__other__').length*row.n;
      for(const reason of [row.initial,...(row.routing_events||[])].filter(v=>this.isRoute(v))) result.routes.set(reason,(result.routes.get(reason)||0)+row.n);
    }
    return result;
  },
  initial(value) { return this.isRoute(value) ? '__routed__' : value; },
  step(row, stage) { return row.dynamics[stage] || (row.dynamics.length ? '__end__' : '__none__'); },
  outcomes: ['Tuzaldi', "O'zgarishsiz", 'Reabilitatsiyaga yuborildi', "Boshqa shifoxonaga o'tkazildi", 'Vafot etdi'],
  palette: ['#2563eb', '#0891b2', '#7c3aed', '#6366f1', '#db2777'],
  color(value, index) {
    return ({Tuzaldi:'#0d9488', "O'zgarishsiz":'#b7791f', 'Reabilitatsiyaga yuborildi':'#2563eb',
      "Boshqa shifoxonaga o'tkazildi":'#7c3aed', 'Vafot etdi':'#e11d48', __active__:'#036985'})[value] ||
      (value.startsWith('__') ? '#64748b' : this.palette[index % this.palette.length]);
  },
  validate(data) {
    if (!data || !Array.isArray(data.rows) || !Number.isSafeInteger(data.total) || data.total < 0) throw new Error('Invalid flow response');
    let total = 0;
    for (const row of data.rows) {
      if (!Number.isSafeInteger(row.n) || row.n <= 0 || typeof row.initial !== 'string' ||
        typeof row.outcome !== 'string' || typeof row.route !== 'string' || !Array.isArray(row.dynamics) ||
        row.dynamics.some(v => typeof v !== 'string') || (row.subtype!==undefined && !['STEMI','NSTEMI','AMI','Ishemik insult','Gemorragik insult','TIA','__subtype_unknown__'].includes(row.subtype)) ||
        (row.routing_events!==undefined && (!Array.isArray(row.routing_events) || row.routing_events.some(v=>typeof v!=='string' || !this.isRoute(v))))) throw new Error('Invalid flow row');
      total += row.n;
    }
    if (total !== data.total) throw new Error('Flow totals do not reconcile');
    return data;
  },
  shell() {
    const tr=value=>this.text(value);
    return `<section id="treatment-flow" class="tf-section" aria-labelledby="tf-title"><header class="tf-heading"><div><h3 id="tf-title">${tr('Muolaja va natija')}</h3><p>${tr('Dastlabki davolashdan yakuniy natijagacha')}</p></div></header>${['infarkt','insult'].map(d=>`<article class="tf-card" id="tf-${d}" aria-label="${tr(d === 'infarkt' ? 'Infarkt' : 'Insult')}"></article>`).join('')}</section>`;
  },
  mount(profile, snapshot, onFiltersChange) {
    ++this.epoch;
    this.profile = profile;
    this.onFiltersChange = onFiltersChange;
    const date=value=>value ? new Date(new Date(value).getTime()+5*3600000).toISOString().slice(0,10) : '';
    for (const d of ['infarkt','insult']) {
      // Dashboard mode hydrates both charts from the exact KPI snapshot.
      const previous = this.states[d];
      this.states[d] = { region: profile?.role === 'super_admin' ? '' : (profile?.viloyat || ''), facility:'', from:'', to:'',
        ...(previous ? {region:previous.region,facility:previous.facility,from:previous.from,to:previous.to} : {}),
        data:null, selection:null, shown:1, seq:(previous?.seq || 0), loading:true, error:null };
      if(snapshot) Object.assign(this.states[d],snapshot.filters,{from:date(snapshot.filters.from),to:date(snapshot.filters.to),
        data:this.validate(snapshot.flows[d]),loading:false});
      this.render(d); if(!snapshot) this.load(d);
    }
  },
  async load(d) {
    if(this.onFiltersChange) { this.onFiltersChange(this.states[d]); return; }
    const s=this.states[d], seq=++s.seq, epoch=this.epoch;
    s.loading=true; s.error=null; s.data=null; s.selection=null; this.render(d);
    try {
      if (s.from && s.to && s.from>s.to) throw new Error('Sana oralig‘i noto‘g‘ri');
      const {data,error}=await getSupabase().rpc('get_treatment_flow', {
        p_disease:d,p_viloyat:s.region || null,p_muassasa:s.facility || null,
        p_from:s.from ? `${s.from}T00:00:00+05:00` : null,
        p_to:s.to ? `${s.to}T23:59:59.999999+05:00` : null
      });
      if(error) throw error;
      if(epoch!==this.epoch || seq!==s.seq) return;
      s.data=this.validate(data);
    } catch(error) {
      if(epoch!==this.epoch || seq!==s.seq) return;
      console.warn('Treatment flow could not load', error.code || error.message);
      s.error=s.from && s.to && s.from>s.to ? 'Boshlanish sanasi tugash sanasidan keyin bo‘lmasin.' : 'Ma’lumotni yuklab bo‘lmadi. Qayta urinib ko‘ring.';
    }
    s.loading=false; this.render(d);
  },
  change(d,key,value) {
    if(!['region','facility','from','to'].includes(key)) return;
    const s=this.states[d]; s[key]=value;
    if(key==='region') s.facility='';
    s.shown=1;
    if(s.from && s.to && s.from>s.to) {s.error='Boshlanish sanasi tugash sanasidan keyin bo‘lmasin.';this.render(d);return;}
    this.load(d);
  },
  reset(d) {
    Object.assign(this.states[d],{region:this.profile?.role==='super_admin'?'':(this.profile?.viloyat||''),facility:'',from:'',to:'',shown:1});
    this.load(d);
  },
  select(d,column,key) {
    const s=this.states[d];
    s.selection=s.selection?.column===column && s.selection?.key===key ? null : {column,key};
    this.render(d);
  },
  expand(d) { this.states[d].shown++; this.render(d); },
  filtered(s) {
    const rows=s.data?.rows || [], selected=s.selection;
    if(!selected) return rows;
    return rows.filter(r=>(selected.column==='subtype' ? this.subtype(r) : selected.column==='initial' ? this.initial(r.initial) : selected.column==='outcome' ? r.outcome :
      selected.column==='route' ? (r.outcome===this.outcomes[3] ? r.route : null) : this.step(r,Number(selected.column)))===selected.key);
  },
  catalog(d,dynamic) {
    const list=d==='infarkt' ? APP_CONFIG[dynamic?'DINAMIKA_MUOLAJALAR':'INFARKT_MUOLAJALARI'] : APP_CONFIG[dynamic?'DINAMIKA_MUOLAJALAR_INSULT':'INSULT_MUOLAJALARI'];
    const initial=APP_CONFIG[d==='infarkt'?'INFARKT_MUOLAJALARI':'INSULT_MUOLAJALARI'];
    return [...new Set(list.filter(v=>!v.includes('tkazildi')&&!this.isNonTreatment(v)).map(v=>initial.find(name=>name.toLowerCase()===v.toLowerCase()) || v))];
  },
  model(d) {
    const s=this.states[d],rows=this.filtered(s), max=Math.max(0,...(s.data?.rows || []).map(r=>r.dynamics.length));
    const stages=Math.min(s.shown,Math.max(1,max));
    const columns=[{key:'subtype',title:'Kasallik turi',values:d==='infarkt'?['STEMI','NSTEMI','AMI']:['Ishemik insult','Gemorragik insult','TIA'],get:r=>this.subtype(r)},
      {key:'initial',title:'Dastlabki davolash',values:this.catalog(d,false),get:r=>this.initial(r.initial)}];
    for(let i=0;i<stages;i++) columns.push({key:String(i),title:`${this.text('Dinamik davolash')} · ${i+1}`,values:this.catalog(d,true),get:r=>this.step(r,i)});
    columns.push({key:'outcome',title:'Yakuniy natija',values:this.outcomes,get:r=>r.outcome});
    for(const col of columns) {
      const counts=new Map(col.values.map(v=>[v,0]));
      for(const row of rows) counts.set(col.get(row),(counts.get(col.get(row))||0)+row.n);
      const available=new Map();
      for(const row of s.data.rows) available.set(col.get(row),(available.get(col.get(row))||0)+row.n);
      for(const key of available.keys()) if(!counts.has(key)) counts.set(key,0);
      col.nodes=[...counts].map(([key,n],i)=>({key,n,available:available.get(key)||0,color:this.color(key,i)}));
      col.omitted=col.key==='outcome'?0:col.nodes.filter(n=>this.isNonTreatment(n.key)).reduce((sum,n)=>sum+n.n,0);
      if(col.key!=='outcome') col.nodes=col.nodes.filter(n=>!this.isNonTreatment(n.key));
    }
    return {rows,columns,max,stages,supplementary:this.supplementary(rows),total:rows.reduce((n,r)=>n+r.n,0)};
  },
  render(d) {
    const host=document.getElementById('tf-'+d); if(!host) return;
    const s=this.states[d],tr=v=>this.text(v),option=(v,label)=>`<option value="${esc(v)}">${esc(tr(label))}</option>`;
    const regions=this.profile?.role==='super_admin' ? APP_CONFIG.VILOYATLAR : [this.profile?.viloyat].filter(Boolean);
    const facilities=[...new Set(s.region ? (APP_CONFIG.MUASSASALAR[s.region]||[]) : Object.values(APP_CONFIG.MUASSASALAR).flat())];
    if(s.facility && !facilities.includes(s.facility)) facilities.push(s.facility);
    host.innerHTML=`<header class="tf-card-head"><h4>${d==='infarkt'?'INFARKT':'INSULT'}</h4><span class="tf-cohort">${tr('Hisob birligi: qabul yozuvi')}</span></header>
      <div class="tf-filters"><label>${tr('Viloyat')}<select data-filter="region" aria-label="${d} ${tr('Viloyat')}" ${this.profile?.role!=='super_admin'?'disabled':''}>${option('','Barcha viloyatlar')}${regions.map(v=>option(v,v)).join('')}</select></label>
      <label>${tr('Muassasa')}<select data-filter="facility" aria-label="${d} ${tr('Muassasa')}">${option('','Barcha muassasalar')}${facilities.map(v=>option(v,v)).join('')}</select></label>
      <label>${tr('Davr: dan')}<input type="date" data-filter="from" aria-label="${d} ${tr('Davr: dan')}" value="${esc(s.from)}"></label>
      <label>${tr('Davr: gacha')}<input type="date" data-filter="to" aria-label="${d} ${tr('Davr: gacha')}" value="${esc(s.to)}"></label>
      <button type="button" data-action="reset">${tr('Tozalash')}</button></div>
      <div class="tf-content" aria-live="polite" aria-busy="${s.loading}"></div>`;
    host.querySelectorAll('[data-filter]').forEach(el=>{el.value=s[el.dataset.filter];el.onchange=()=>this.change(d,el.dataset.filter,el.value);});
    host.querySelector('[data-action="reset"]').onclick=()=>this.reset(d);
    const content=host.querySelector('.tf-content');
    if(s.loading) {content.innerHTML=`<p class="tf-state">${tr('Muolajalar va natijalar yuklanmoqda…')}</p>`;return;}
    if(s.error) {content.innerHTML=`<p class="tf-state" role="alert">${tr(s.error)} <button type="button">${tr('Qayta urinish')}</button></p>`;content.querySelector('button').onclick=()=>this.load(d);return;}
    if(!s.data?.total) {content.innerHTML=`<p class="tf-state">${tr('Tanlangan filtrlar bo‘yicha ma’lumot yo‘q.')}</p>`;return;}
    const m=this.model(d);
    const issues=s.data.rows.reduce((n,r)=>n+Number(r.ambiguous||0)+Number(r.invalid_count||0),0);
    content.innerHTML=`<div class="tf-summary"><strong>${this.number(m.total)} ${tr('qabul yozuvi')}</strong><span>${s.selection?`${tr('Jami')} ${this.number(s.data.total)}`:''}</span>
      ${m.stages<m.max?`<button data-action="expand">${tr('Keyingi dinamik bosqich')} (${m.stages+1}/${m.max})</button>`:''}</div>
      <div class="tf-scroll" tabindex="0" aria-label="${tr('Davolash yo‘li grafigi')}"><div class="tf-graph"><canvas aria-hidden="true"></canvas><div class="tf-columns"></div></div></div>
      <div class="tf-supplementary">${this.supplementaryHTML(m.supplementary)}</div><details class="tf-method"><summary>${tr('Ma’lumot haqida')}${issues?' · ⚠':''}</summary><p>${tr('Filtr kartochkalar va ikkala grafik uchun umumiy. Davr — dastlabki qabul sanasi bo‘yicha.')}</p>${issues?`<p class="tf-warning">${tr('Bog‘lanishi yoki vaqti noaniq yozuvlar mavjud. Ular taxminan ketma-ketlikka qo‘shilmagan.')} (${this.number(issues)})</p>`:''}<p>${tr('Asosiy holat qabul statusidan olinadi. Chiqarish qaydi bilan zid yozuvlar')}: ${this.number(s.data.rows.reduce((n,r)=>n+Number(r.status_conflicts||0),0))}</p><p>${tr('Bir qabul — bir yo‘l. Dinamik muolajalar created_at bo‘yicha ketma-ket olinadi; faqat oxirgisi bilan cheklanmaydi. Bir xil vaqtdagi yozuvlar tartibi shartli. Dinamik yozuv yo‘qligi muolaja bajarilmaganini bildirmaydi.')}</p><p>${tr('Manba: qabul, dinamika_muolajalar va chiqarish jadvallari. Eng so‘nggi chiqish qaydi ishlatiladi. Takroriy karta raqamida bog‘lanish noaniq bo‘lsa, dinamik ma’lumot taxminan biriktirilmaydi. Muolaja uchun yo‘naltirish bajarilgan amaliyot deb hisoblanmaydi.')}</p><p>${tr('Davolanmoqda va qayd etilmagan natijalar yashirilmaydi. Yomonlashib chiqarilgan eski yozuvlar alohida saqlanadi. Sonlar foydalanuvchining kirish huquqlari doirasida hisoblanadi.')}</p></details>`;
    content.querySelector('[data-action="expand"]')?.addEventListener('click',()=>this.expand(d));
    this.draw(d,m,content);
  },
  supplementaryHTML(info) {
    const tr=v=>this.text(v),n=v=>this.number(v);
    return `${info.diagnosticInitial||info.diagnosticDynamic?`<details open><summary>${tr('Diagnostik tekshiruvlar')}</summary><p><strong>${tr('MSKT angiografiya')}</strong></p><p>${tr('Dastlabki qayd')}: ${n(info.diagnosticInitial)} · ${tr('Dinamik qayd')}: ${n(info.diagnosticDynamic)}</p></details>`:''}
      ${info.notPerformed||info.unclassified?`<details><summary>${tr('Muolaja holati')}</summary><p>${tr('Muolaja bajarilmagan')}: ${n(info.notPerformed)}</p><p>${tr('Aniqlashtirilishi kerak')}: ${n(info.unclassified)}</p></details>`:''}`;
  },
  routeCounts(d,rows) {
    const counts=new Map((d==='infarkt'?['__route_angio__','__route_stable__','__route_other__']:['__route_mskt__','__route_angio__','__route_stable__','__route_other__']).map(v=>[v,0]));
    for(const row of rows) if(row.outcome===this.outcomes[3]) counts.set(row.route,(counts.get(row.route)||0)+row.n);
    return counts;
  },
  draw(d,m,content) {
    const graph=content.querySelector('.tf-graph'),wrap=content.querySelector('.tf-columns');
    const colWidth=250,gap=110,width=m.columns.length*colWidth+(m.columns.length-1)*gap;
    const largest=Math.max(1,...m.columns.flatMap(c=>c.nodes.map(n=>n.n)));
    // A common scale for every link; readable label boxes may be taller than their flow.
    const scale=Math.min(2,90/largest), positions=[];
    let height=0;
    m.columns.forEach((col,ci)=>{
      let y=60; const x=ci*(colWidth+gap),pos=new Map();
      const section=document.createElement('section'); section.className='tf-column'; section.style.left=x+'px';
      const heading=document.createElement('h5');heading.textContent=this.text(col.title);section.appendChild(heading);wrap.appendChild(section);
      if(col.omitted) {
        const note=document.createElement('p');note.className='tf-column-note';note.textContent=this.text('Alohida bo‘limda')+': '+this.number(col.omitted);section.appendChild(note);y=82;
      }
      col.nodes.forEach(node=>{
        const h=Math.max(64,node.n*scale+20),b=document.createElement('button');
        b.type='button'; b.className='tf-node';b.style.cssText=`top:${y}px;height:${h}px;border-left-color:${node.color}`;
        b.disabled=!node.available;b.dataset.key=node.key;b.setAttribute('aria-pressed',String(this.states[d].selection?.column===col.key&&this.states[d].selection?.key===node.key));
        const share=m.total?(node.n/m.total*100).toFixed(1):'0.0';
        b.innerHTML=`<span>${esc(this.label(node.key))}</span><strong>${this.number(node.n)} <small>${share}%</small></strong>`;
        b.title=`${this.label(node.key)}: ${this.number(node.n)} / ${this.number(m.total)}`;
        b.dataset.column=String(ci);
        b.onclick=()=>this.select(d,col.key,node.key);
        section.appendChild(b);pos.set(node.key,{x,y:y+h/2,node,offset:0});y+=h+10;
        if(col.key==='outcome' && node.key===this.outcomes[3]) {
          const s=this.states[d],counts=this.routeCounts(d,m.rows),available=this.routeCounts(d,s.data.rows);
          for(const key of available.keys()) if(!counts.has(key)) counts.set(key,0);
          const detail=document.createElement('details');detail.className='tf-transfer-routes';detail.style.top=y+'px';detail.open=!!s.routeOpen;
          detail.innerHTML=`<summary>${this.text('Marshrutizatsiya bo‘yicha')}</summary><div>${[...counts].map(([key,n])=>`<button type="button" data-route="${key}" aria-pressed="${s.selection?.column==='route'&&s.selection?.key===key}" ${available.get(key)?'':'disabled'}><span>${esc(this.label(key))}</span><strong>${this.number(n)}</strong></button>`).join('')}</div>`;
          const events=m.supplementary.routes;
          if(events.size) detail.insertAdjacentHTML('beforeend',`<div class="tf-route-events"><p>${this.text('Yo‘naltirish qaydlari — yakuniy natijadan mustaqil')}</p>${[...events].map(([key,n])=>`<p><span>${esc(this.label(key))}</span><strong>${this.number(n)}</strong></p>`).join('')}</div>`);
          detail.querySelectorAll('[data-route]').forEach(button=>button.onclick=()=>this.select(d,'route',button.dataset.route));
          detail.ontoggle=()=>{if(detail.isConnected && s.routeOpen!==detail.open){s.routeOpen=detail.open;this.render(d);}};
          section.appendChild(detail);y+=detail.getBoundingClientRect().height+10;
        }
      });
      height=Math.max(height,y);positions.push(pos);
    });
    graph.style.width=width+'px';graph.style.height=height+'px';
    const canvas=graph.querySelector('canvas');canvas.width=width;canvas.height=height;
    canvas.style.width=width+'px';canvas.style.height=height+'px';const ctx=canvas.getContext('2d');
    if(!ctx) return;
    const bands=[];
    for(let i=0;i<m.columns.length-1;i++) {
      const edges=new Map();for(const r of m.rows){const a=m.columns[i].get(r),b=m.columns[i+1].get(r),key=JSON.stringify([a,b]);edges.set(key,(edges.get(key)||0)+r.n);}
      const incoming=new Map(),outgoing=new Map();
      for(const [key,n]of edges){const[a,b]=JSON.parse(key),p=positions[i].get(a),q=positions[i+1].get(b),thickness=n*scale;
        if(!p || !q) continue; // Non-treatment categories have their own sections, never invented treatment links.
        const y1=p.y-p.node.n*scale/2+(outgoing.get(a)||0)+thickness/2;
        const y2=q.y-q.node.n*scale/2+(incoming.get(b)||0)+thickness/2;
        outgoing.set(a,(outgoing.get(a)||0)+thickness);incoming.set(b,(incoming.get(b)||0)+thickness);
        const path=new Path2D();path.moveTo(p.x+colWidth,y1);path.bezierCurveTo(p.x+colWidth+gap*.5,y1,q.x-gap*.5,y2,q.x,y2);
        bands.push({path,column:i,a,b,color:q.node.color,thickness});
      }
    }
    let active=null;
    const matches=(band,target)=>target && (target.band ? band===target.band :
      (band.column===target.column && band.a===target.key) || (band.column+1===target.column && band.b===target.key));
    const paint=target=>{
      if(target===active) return;
      active=target;
      ctx.clearRect(0,0,width,height);
      // Draw emphasized bands last; keep the original count-proportional width.
      for(const highlighted of [false,true]) for(const band of bands) {
        const hit=!!matches(band,target);if(hit!==highlighted) continue;
        ctx.strokeStyle=band.color;ctx.globalAlpha=target?(hit?.9:.06):(this.states[d].selection?.42:.17);
        ctx.lineWidth=band.thickness;ctx.stroke(band.path);
      }
      graph.querySelectorAll('.tf-node').forEach(button=>{
        const column=Number(button.dataset.column),key=button.dataset.key;
        button.classList.toggle('tf-linked',!!target && bands.some(band=>matches(band,target) &&
          ((band.column===column&&band.a===key)||(band.column+1===column&&band.b===key))));
      });
    };
    const nodeTarget=element=>{
      const node=element?.closest?.('.tf-node');
      return node&&!node.disabled?{column:Number(node.dataset.column),key:node.dataset.key}:null;
    };
    graph.onpointermove=event=>{
      if(event.pointerType==='touch') return;
      let target=nodeTarget(event.target);
      if(!target) {
        const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*width/rect.width,y=(event.clientY-rect.top)*height/rect.height;
        for(let i=bands.length-1;i>=0;i--) {ctx.lineWidth=Math.max(bands[i].thickness,6);
          if(ctx.isPointInStroke(bands[i].path,x,y)){target={band:bands[i]};break;}}
      }
      if(target?.band===active?.band && target?.column===active?.column && target?.key===active?.key) return;
      paint(target);
    };
    graph.onpointerleave=()=>paint(null);
    graph.addEventListener('focusin',event=>paint(nodeTarget(event.target)));
    graph.addEventListener('focusout',()=>paint(null));
    active=undefined;paint(null);
  }
};

(function(){
 var status=document.getElementById('visitor-status'),total=document.getElementById('visitor-total'),countries=document.getElementById('visitor-countries'),list=document.getElementById('visitor-country-list');
 var names;
 try{names=new Intl.DisplayNames([navigator.language||'en'],{type:'region'});}catch(_){names=null;}
 function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
 fetch('/api/admin/artists',{credentials:'same-origin'})
 .then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'Administrator access is required.');return d;});})
 .then(function(data){
  var stats=data.visitorStats||{totalVisits:0,countries:0,byCountry:[]};
  total.textContent=Number(stats.totalVisits||0).toLocaleString();
  countries.textContent=Number(stats.countries||0).toLocaleString();
  status.textContent='Administrator access confirmed · Last 30 days';
  list.replaceChildren();
  if(!stats.byCountry.length){list.append(el('p','admin-empty','No country-level visits have been recorded yet. Once the migration is installed and visitors load the gallery, results will appear here.'));return;}
  var max=Math.max.apply(null,stats.byCountry.map(function(x){return x.visits;}));
  stats.byCountry.forEach(function(item){
   var code=String(item.countryCode||'').toUpperCase(),label=names&&/^[A-Z]{2}$/.test(code)?names.of(code):code;
   var row=el('article','admin-record visitor-country-row');
   var main=el('div','admin-record-main');
   main.append(el('strong','',label+' ('+code+')'),el('small','',Number(item.visits).toLocaleString()+' gallery visit(s)'));
   var track=el('div','visitor-bar');var fill=el('span','');fill.style.width=(Number(item.visits)/max*100)+'%';track.append(fill);main.append(track);row.append(main);list.append(row);
  });
 })
 .catch(function(err){status.textContent='Statistics unavailable';list.replaceChildren(el('p','admin-empty',err.message));});
})();

(function () {
  var list = document.getElementById('feedback-admin-list');
  var status = document.getElementById('feedback-admin-status');
  var message = document.getElementById('feedback-admin-message');
  function el(tag, cls, value) { var n=document.createElement(tag); if(cls)n.className=cls; if(value!==undefined)n.textContent=value; return n; }
  function show(text) { message.hidden=false; message.textContent=text; }
  function decide(item, decision, row) {
    var buttons=row.querySelectorAll('button'); buttons.forEach(function(b){b.disabled=true;});
    fetch('/api/feedback/moderate',{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,status:decision})})
      .then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'Could not update feedback.');return d;});})
      .then(function(){row.remove();if(!list.querySelector('.feedback-admin-row'))list.append(el('p','admin-empty','The review queue is clear.'));show('Feedback '+decision+'.');})
      .catch(function(err){show(err.message);buttons.forEach(function(b){b.disabled=false;});});
  }
  fetch('/api/feedback/queue',{credentials:'same-origin'})
    .then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'Administrator access is required.');return d;});})
    .then(function(data){
      status.textContent='Administrator access confirmed';
      list.replaceChildren();
      if(!data.feedback.length){list.append(el('p','admin-empty','The review queue is clear.'));return;}
      data.feedback.forEach(function(item){
        var row=el('article','admin-record feedback-admin-row');
        var main=el('div','admin-record-main');
        main.append(el('strong','',item.artworkTitle),el('small','',item.displayName+' · '+item.artworkSlug+' · '+new Date(item.createdAt).toLocaleString()));
        if(item.rating)main.append(el('p','admin-application-detail','Rating: '+item.rating+'/5'));
        if(item.comment)main.append(el('p','admin-application-detail',item.comment));
        var actions=el('div','admin-record-actions');
        var approve=el('button','admin-action admin-action--approve','Approve');approve.type='button';approve.addEventListener('click',function(){decide(item,'approved',row);});
        var reject=el('button','admin-action admin-action--danger','Reject');reject.type='button';reject.addEventListener('click',function(){decide(item,'rejected',row);});
        actions.append(approve,reject);row.append(main,actions);list.append(row);
      });
    })
    .catch(function(err){status.textContent='Access unavailable';list.replaceChildren();show(err.message);});
})();

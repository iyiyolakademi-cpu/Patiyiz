/* Keep the existing feed selector functional through the centered visual logo. */
(()=>{'use strict';
document.addEventListener('click',event=>{
 const logo=event.target.closest('#buchee-header-logo-trigger');
 if(!logo)return;
 event.preventDefault();
 const trigger=document.getElementById('pati-feed-menu-trigger');
 if(trigger)trigger.click();
});
})();

/* Shared demo feature configuration. No timers or DOM listeners. */
(()=>{'use strict';
 const enabled=new URLSearchParams(location.search).get('demo')==='1';
 window.BucheeDemoConfig=Object.freeze({enabled});
})();
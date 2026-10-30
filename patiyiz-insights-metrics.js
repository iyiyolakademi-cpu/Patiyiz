/* Small pure metric helpers extracted from app.js; no network calls or inferred stats. */
(function(global){
  'use strict';
  const valid=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
  const count=value=>valid(value)&&Number(value)>=0?Number(value):null;
  const change=(now,previous)=>{
    const a=count(now),b=count(previous);
    if(a===null||b===null)return {direction:'unknown',label:'Veri yok',delta:null};
    const delta=a-b;
    const percent=b===0?(a>0?'Yeni':'0%'):(delta/b*100).toLocaleString('tr-TR',{maximumFractionDigits:1})+'%';
    return {direction:delta>0?'increase':delta<0?'decrease':'neutral',label:percent,delta};
  };
  // If event history is incomplete, never claim a precise net follower change.
  const followerChange=(gained,lost,complete)=>({
    gained:count(gained),lost:count(lost),
    net:complete&&count(gained)!==null&&count(lost)!==null?count(gained)-count(lost):null,
    complete:complete===true
  });
  global.PatiyizInsightsMetrics=Object.freeze({count,change,followerChange});
})(window);

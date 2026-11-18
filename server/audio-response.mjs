// Native media elements request byte ranges for seeking and restarting loops.
export function audioResponse(req,res,data,mime){
 const headers={'Content-Type':mime,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
 const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range||'');
 if(match&&(match[1]||match[2])){
  const start=match[1]?Number(match[1]):Math.max(0,data.length-Number(match[2]));
  const end=match[1]?(match[2]?Math.min(data.length-1,Number(match[2])):data.length-1):data.length-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=data.length||start<0||end<start){res.writeHead(416,{...headers,'Content-Range':`bytes */${data.length}`}).end();return}
  const body=data.subarray(start,end+1);res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':body.length}).end(req.method==='HEAD'?undefined:body);return;
 }
 res.writeHead(200,{...headers,'Content-Length':data.length}).end(req.method==='HEAD'?undefined:data);
}

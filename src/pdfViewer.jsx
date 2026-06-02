import { useState, useRef, useEffect } from "react";

export default function PdfViewer({ pdfUrl, fileName, onClose }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function loadPdf() {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url
          ).href;
        }
        const pdf = await pdfjs.getDocument(pdfUrl).promise;
        if (cancelled) return;
        const pageImages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport }).promise;
          pageImages.push(canvas.toDataURL("image/jpeg", 0.92));
        }
        if (!cancelled) { setPages(pageImages); setLoading(false); }
      } catch (err) {
        console.error("PDF error:", err);
        if (!cancelled) setLoading(false);
      }
    }
    loadPdf();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const origOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = origOverflow;
    };
  }, []);

  const totalPages = pages.length;
  const zoomIn = () => setScale(s => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
  const goPrev = () => setCurrentPage(p => Math.max(1, p - 1));
  const goNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.88)",
      backdropFilter:"blur(10px)",display:"flex",flexDirection:"column"
    }} onClick={onClose}>
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"14px 24px",borderBottom:"1px solid rgba(255,255,255,.08)",
        flexShrink:0
      }} onClick={e => e.stopPropagation()}>
        <span style={{color:"#fff",fontSize:15,fontWeight:600}}>{fileName||"Document"}</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={zoomOut} disabled={scale<=0.5} style={btnStyle}>−</button>
          <span style={{color:"rgba(255,255,255,.45)",fontSize:11,minWidth:36,textAlign:"center"}}>{Math.round(scale*100)}%</span>
          <button onClick={zoomIn} disabled={scale>=3} style={btnStyle}>+</button>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.08)",margin:"0 8px"}}/>
          <a href={pdfUrl} download={fileName||"document.pdf"} style={{...btnStyle,color:"#14B8A6"}} title="Télécharger">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </a>
          <button onClick={onClose} style={{...btnStyle,color:"rgba(255,255,255,.6)"}} title="Fermer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div style={{
        flex:1,overflow:"auto",display:"flex",justifyContent:"center",
        WebkitOverflowScrolling:"touch",padding:"24px 10px"
      }} onClick={e => e.stopPropagation()}>
        {loading ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",minHeight:300}}>
            <div style={{width:36,height:36,borderRadius:"50%",border:"3px solid rgba(255,255,255,.08)",borderTopColor:"#14B8A6",animation:"spin .8s linear infinite"}}/>
            <p style={{color:"rgba(255,255,255,.45)",fontSize:14,marginTop:16}}>Chargement en cours...</p>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,width:"100%"}}>
            {pages.map((img,i) => (
              <img key={i} src={img} alt={`Page ${i+1}`}
                style={{width:`${scale*100}%`,maxWidth:"100vw",borderRadius:8,boxShadow:"0 4px 32px rgba(0,0,0,.45)",display:"block"}}/>
            ))}
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,padding:"12px 24px",borderTop:"1px solid rgba(255,255,255,.08)"}} onClick={e => e.stopPropagation()}>
          <button onClick={goPrev} disabled={currentPage<=1} style={footBtnStyle}>← Précédent</button>
          <span style={{color:"rgba(255,255,255,.35)",fontSize:12}}>{currentPage}/{totalPages}</span>
          <button onClick={goNext} disabled={currentPage>=totalPages} style={footBtnStyle}>Suivant →</button>
        </div>
      )}
    </div>
  );
}

const btnStyle = {
  background:"rgba(255,255,255,.06)",border:"none",color:"#fff",
  width:34,height:34,borderRadius:8,cursor:"pointer",
  display:"flex",alignItems:"center",justifyContent:"center",
  textDecoration:"none",fontSize:16
};

const footBtnStyle = {
  background:"rgba(255,255,255,.06)",border:"none",
  color:"rgba(255,255,255,.6)",padding:"7px 14px",
  borderRadius:8,cursor:"pointer",fontSize:12.5,
  fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:600,
};

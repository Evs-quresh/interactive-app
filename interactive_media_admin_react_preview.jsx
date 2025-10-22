import React, { useState, useRef, useEffect } from "react";

// Professional, demoable Interactive Media Admin UI
// - Uses a real playable sample video for designer + preview
// - Allows drag-to-create hotspots (SVG overlay)
// - Link hotspots to mock products and simulate "Add to Cart"
// - Draft -> Preview -> Publish flow using local state (mock API)

export default function InteractiveMediaAdminPreview() {
  const SAMPLE_VIDEO = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4";

  const [route, setRoute] = useState("/dashboard");
  const [user] = useState({ name: "Admin User", avatar: "https://i.pravatar.cc/48" });

  // media list with status draft/published
  const [mediaList, setMediaList] = useState([
    {
      id: 1,
      title: "Promo: Summer Tee",
      thumb: "https://source.unsplash.com/400x250/?man,tshirt,portrait",
      videoUrl: SAMPLE_VIDEO,
      status: "draft",
      hotspots: [], // array of {id, x, y, w, h, timeStart, timeEnd, productId, action}
    },
  ]);

  const [selectedMediaId, setSelectedMediaId] = useState(1);
  const selectedMedia = mediaList.find((m) => m.id === selectedMediaId);

  // products mock
  const [products] = useState([
    { id: "p1", name: "Blue T-Shirt", price: 29.99, img: "https://source.unsplash.com/80x80/?tshirt" },
    { id: "p2", name: "Sneakers", price: 69.99, img: "https://source.unsplash.com/80x80/?sneakers" },
    { id: "p3", name: "Watch", price: 199.0, img: "https://source.unsplash.com/80x80/?watch" },
  ]);

  // Designer specific state
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [tempRect, setTempRect] = useState(null);
  const [hotspots, setHotspots] = useState(selectedMedia?.hotspots || []);
  const [selectedProduct, setSelectedProduct] = useState(products[0].id);
  const [selectedAction, setSelectedAction] = useState("addToCart");

  // preview & cart
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);

  // sync hotspots when selected media changes
  useEffect(() => {
    setHotspots(selectedMedia?.hotspots || []);
  }, [selectedMediaId]);

  // helpers to update mediaList (mock backend actions)
  function saveHotspotsToMedia(mediaId, hotspotsPayload) {
    setMediaList((prev) => prev.map((m) => (m.id === mediaId ? { ...m, hotspots: hotspotsPayload } : m)));
    setToast("Hotspots saved (draft)");
    setTimeout(() => setToast(null), 2000);
  }

  function publishMedia(mediaId) {
    setMediaList((prev) => prev.map((m) => (m.id === mediaId ? { ...m, status: "published" } : m)));
    setToast("Video published ✅");
    setTimeout(() => setToast(null), 2000);
  }

  // Drawing logic for hotspot creation (SVG overlay coordinates normalized)
  function onMouseDown(e) {
    if (route !== "/designer") return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setDrawStart({ x, y });
    setTempRect({ x, y, w: 0, h: 0 });
  }

  function onMouseMove(e) {
    if (!isDrawing) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const sx = drawStart.x;
    const sy = drawStart.y;
    const w = x - sx;
    const h = y - sy;
    setTempRect({ x: sx, y: sy, w, h });
  }

  function onMouseUp(e) {
    if (!isDrawing) return;
    setIsDrawing(false);
    // create hotspot normalized relative to container
    const rect = containerRef.current.getBoundingClientRect();
    const videoWidth = rect.width;
    const videoHeight = rect.height;
    const raw = tempRect;
    if (!raw) return;
    const nx = Math.max(0, Math.min(1, raw.x / videoWidth));
    const ny = Math.max(0, Math.min(1, raw.y / videoHeight));
    const nw = Math.max(0, Math.min(1, raw.w / videoWidth));
    const nh = Math.max(0, Math.min(1, raw.h / videoHeight));

    // time range from current video time
    const timeStart = Math.max(0, Math.floor(videoRef.current?.currentTime || 0));
    const timeEnd = timeStart + 10; // default 10s range

    const newHotspot = {
      id: Date.now(),
      x: nx,
      y: ny,
      w: nw,
      h: nh,
      timeStart,
      timeEnd,
      productId: selectedProduct,
      action: selectedAction,
    };
    const next = [...hotspots, newHotspot];
    setHotspots(next);
    setTempRect(null);
    saveHotspotsToMedia(selectedMediaId, next);
  }

  // Preview player click handler - detect hotspots at current time
  function onPreviewClick(e) {
    if (route !== "/preview") return;
    // not used; preview clicks are handled by hotspot elements directly
  }

  function openPreview(mediaId) {
    setSelectedMediaId(mediaId);
    setPreviewOpen(true);
    setRoute("/preview");
  }

  function closePreview() {
    setPreviewOpen(false);
    setRoute("/dashboard");
  }

  function handleHotspotClick(hotspot) {
    const product = products.find((p) => p.id === hotspot.productId);
    if (hotspot.action === "addToCart") {
      setCart((c) => [...c, product]);
      setToast(`${product.name} added to cart`);
      setTimeout(() => setToast(null), 2000);
    }
  }

  // Utility to render hotspots in absolute pixels
  function renderHotspotsFor(media) {
    if (!media) return null;
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const vw = rect.width;
    const vh = rect.height;

    return media.hotspots.map((h) => {
      const left = h.x * vw;
      const top = h.y * vh;
      const width = Math.max(8, Math.abs(h.w) * vw);
      const height = Math.max(8, Math.abs(h.h) * vh);
      return (
        <button
          key={h.id}
          onClick={() => handleHotspotClick(h)}
          style={{ left, top, width, height }}
          className="absolute border-2 border-red-400 bg-red-400/20 rounded pointer-events-auto"
          title={`Action: ${h.action}`}
        />
      );
    });
  }

  // Main UI pieces
  function Sidebar() {
    return (
      <aside className="w-72 bg-white border-r shadow-md flex flex-col">
        <div className="p-5 text-2xl font-bold text-indigo-600 flex items-center gap-3">
          <img src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=48&q=60" alt="logo" className="w-10 h-10 rounded" />
          <div>Interactive</div>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setRoute('/dashboard')} className={`w-full text-left px-3 py-2 rounded ${route==='/dashboard'? 'bg-indigo-50 text-indigo-600':''}`}>Dashboard</button>
          <button onClick={() => setRoute('/media')} className={`w-full text-left px-3 py-2 rounded ${route==='/media'? 'bg-indigo-50 text-indigo-600':''}`}>Media</button>
          <button onClick={() => setRoute('/designer')} className={`w-full text-left px-3 py-2 rounded ${route==='/designer'? 'bg-indigo-50 text-indigo-600':''}`}>Designer</button>
          <button onClick={() => setRoute('/preview')} className={`w-full text-left px-3 py-2 rounded ${route==='/preview'? 'bg-indigo-50 text-indigo-600':''}`}>Preview</button>
          <button onClick={() => setRoute('/products')} className={`w-full text-left px-3 py-2 rounded ${route==='/products'? 'bg-indigo-50 text-indigo-600':''}`}>Products</button>
        </nav>
        <div className="p-4 border-t flex items-center gap-3">
          <img src={user.avatar} className="w-10 h-10 rounded-full" alt="avatar" />
          <div>
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs text-gray-500">Admin</div>
          </div>
        </div>
      </aside>
    );
  }

  function Topbar() {
    const mediaCount = mediaList.length;
    const draftCount = mediaList.filter((m) => m.status === 'draft').length;
    const pubCount = mediaList.filter((m) => m.status === 'published').length;
    return (
      <header className="bg-white h-16 shadow-sm flex items-center justify-between px-6 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Admin Panel</h2>
          <div className="text-sm text-gray-500">{mediaCount} media • {draftCount} drafts • {pubCount} published</div>
        </div>
        <div className="text-sm text-gray-600">Preview Demo</div>
      </header>
    );
  }

  function Dashboard() {
    const totalInteractions = 1234; // mock
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded shadow"> <div className="text-sm text-gray-500">Total Videos</div><div className="text-2xl font-bold">{mediaList.length}</div></div>
          <div className="bg-white p-5 rounded shadow"> <div className="text-sm text-gray-500">Clickable Spots</div><div className="text-2xl font-bold">{mediaList.reduce((s,m)=>s+m.hotspots.length,0)}</div></div>
          <div className="bg-white p-5 rounded shadow"> <div className="text-sm text-gray-500">Total Interactions</div><div className="text-2xl font-bold">{totalInteractions}</div></div>
        </div>

        <div className="bg-white p-5 rounded shadow">
          <h3 className="font-semibold mb-3">Recent Media</h3>
          <div className="grid grid-cols-3 gap-4">
            {mediaList.map((m) => (
              <div key={m.id} className="p-3 border rounded">
                <img src={m.thumb} className="w-full h-28 object-cover rounded" alt="thumb" />
                <div className="mt-2 font-medium">{m.title}</div>
                <div className="text-xs text-gray-500">Status: <span className={`font-semibold ${m.status==='published'?'text-green-600':'text-yellow-600'}`}>{m.status}</span></div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => { setSelectedMediaId(m.id); setRoute('/designer'); }} className="px-2 py-1 bg-indigo-600 text-white rounded text-sm">Edit Hotspots</button>
                  <button onClick={() => openPreview(m.id)} className="px-2 py-1 border rounded text-sm">Preview</button>
                  <button onClick={() => publishMedia(m.id)} className="px-2 py-1 border rounded text-sm">Publish</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function MediaPage() {
    function handleFileUpload(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const newMedia = {
        id: Date.now(),
        title: file.name,
        thumb: "https://source.unsplash.com/400x250/?product,studio",
        videoUrl: SAMPLE_VIDEO,
        status: "draft",
        hotspots: [],
      };
      setMediaList((p) => [newMedia, ...p]);
      setToast('Video uploaded (mock)');
      setTimeout(()=>setToast(null),1500);
    }

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded shadow">
          <h3 className="font-semibold mb-2">Upload Video</h3>
          <div className="flex items-center gap-4">
            <input type="file" accept="video/*" onChange={handleFileUpload} />
            <div className="text-sm text-gray-500">Upload a video file — demo uses a sample playable video.</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h3 className="font-semibold mb-3">Library</h3>
          <div className="grid grid-cols-3 gap-4">
            {mediaList.map(m => (
              <div key={m.id} className="border rounded overflow-hidden">
                <img src={m.thumb} className="w-full h-32 object-cover" />
                <div className="p-3">
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-gray-500">Status: {m.status}</div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => { setSelectedMediaId(m.id); setRoute('/designer'); }} className="px-2 py-1 bg-indigo-600 text-white rounded text-sm">Edit</button>
                    <button onClick={() => openPreview(m.id)} className="px-2 py-1 border rounded text-sm">Preview</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function DesignerPage() {
    const media = selectedMedia;
    if (!media) return <div>Select a media first</div>;

    return (
      <div className="space-y-6">
        <div className="bg-white p-4 rounded shadow flex gap-4">
          <div className="flex-1">
            <div className="font-semibold mb-2">Designer — {media.title}</div>
            <div
              ref={containerRef}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              className="relative bg-black rounded overflow-hidden"
              style={{ width: '800px', height: '450px' }}
            >
              <video ref={videoRef} src={media.videoUrl} controls className="w-full h-full object-cover" />

              {/* existing hotspots (from media.hotspots) */}
              {renderHotspotsFor(media)}

              {/* temp rect while drawing */}
              {tempRect && (
                <div
                  className="absolute border-2 border-dashed border-indigo-400 bg-indigo-400/20"
                  style={{ left: tempRect.x, top: tempRect.y, width: tempRect.w, height: tempRect.h }}
                />
              )}
            </div>
            <div className="mt-3 text-sm text-gray-500">Tip: Click and drag on the video to draw a hotspot. Hotspot time defaults to current play time for 10s.</div>
          </div>

          <aside className="w-80 bg-gray-50 p-3 rounded">
            <div className="mb-3">
              <label className="text-sm font-medium">Link Product</label>
              <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="w-full mt-2 border rounded px-2 py-1">
                {products.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price}</option>)}
              </select>
            </div>

            <div className="mb-3">
              <label className="text-sm font-medium">Action</label>
              <select value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)} className="w-full mt-2 border rounded px-2 py-1">
                <option value="addToCart">Add to Cart</option>
                <option value="openLink">Open Link</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded" onClick={() => saveHotspotsToMedia(media.id, hotspots)}>Save Draft</button>
              <button className="flex-1 border px-3 py-2 rounded" onClick={() => openPreview(media.id)}>Preview</button>
            </div>

            <div className="mt-4 text-sm">
              <div className="font-medium">Hotspots</div>
              <div className="mt-2 space-y-2 max-h-48 overflow-auto">
                {(hotspots || []).map(h => (
                  <div key={h.id} className="p-2 bg-white border rounded text-sm flex justify-between items-center">
                    <div>
                      <div>{products.find(p=>p.id===h.productId)?.name || 'Product'}</div>
                      <div className="text-xs text-gray-500">{h.timeStart}s → {h.timeEnd}s</div>
                    </div>
                    <button className="text-xs text-red-600" onClick={() => { const next = hotspots.filter(x=>x.id!==h.id); setHotspots(next); saveHotspotsToMedia(media.id, next); }}>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  function PreviewPage() {
    const media = selectedMedia;
    const previewVideoRef = useRef(null);

    // Only show hotspots that are active for current time
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
      const vid = previewVideoRef.current;
      if (!vid) return;
      function onTime() {
        setCurrentTime(Math.floor(vid.currentTime));
      }
      vid.addEventListener('timeupdate', onTime);
      return () => vid.removeEventListener('timeupdate', onTime);
    }, [previewOpen]);

    if (!media) return <div>Select a media for preview</div>;

    const activeHotspots = media.hotspots.filter(h => currentTime >= h.timeStart && currentTime <= h.timeEnd);

    return (
      <div className="space-y-4">
        <div className="bg-white p-4 rounded shadow">
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="font-semibold">Preview — {media.title}</div>
              <div className="text-xs text-gray-500">Status: <span className={`font-semibold ${media.status==='published'?'text-green-600':'text-yellow-600'}`}>{media.status}</span></div>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => publishMedia(media.id)}>Publish</button>
              <button className="px-3 py-1 border rounded" onClick={closePreview}>Close</button>
            </div>
          </div>

          <div ref={containerRef} className="relative bg-black rounded overflow-hidden" style={{ width: 960, height: 540 }}>
            <video ref={previewVideoRef} src={media.videoUrl} controls className="w-full h-full object-cover" autoPlay />

            {/* show hotspots that are active for current time */}
            {activeHotspots.map(h => {
              const rect = containerRef.current?.getBoundingClientRect();
              if (!rect) return null;
              const left = h.x * rect.width;
              const top = h.y * rect.height;
              const width = Math.max(8, Math.abs(h.w) * rect.width);
              const height = Math.max(8, Math.abs(h.h) * rect.height);
              const product = products.find(p => p.id === h.productId);
              return (
                <button
                  key={h.id}
                  onClick={() => handleHotspotClick(h)}
                  style={{ left, top, width, height }}
                  className="absolute border-2 border-yellow-300 bg-yellow-300/20 rounded flex items-end justify-center p-1"
                >
                  <div className="text-xs bg-yellow-400 text-black px-1 rounded">{product?.name}</div>
                </button>
              );
            })}

          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="font-semibold mb-2">Cart (demo)</div>
          <div className="flex gap-2">
            {cart.length === 0 && <div className="text-sm text-gray-500">No items in cart</div>}
            {cart.map((c, i) => (
              <div key={i} className="p-2 border rounded flex items-center gap-2">
                <img src={c.img} alt="p" className="w-10 h-10 object-cover rounded" />
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">${c.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function ProductsPage() {
    return (
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-3">Products</h3>
        <div className="grid grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="p-3 border rounded flex gap-3 items-center">
              <img src={p.img} className="w-16 h-16 object-cover rounded" alt="p" />
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-gray-500">${p.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderRoute() {
    switch (route) {
      case "/dashboard": return <Dashboard />;
      case "/media": return <MediaPage />;
      case "/designer": return <DesignerPage />;
      case "/preview": return <PreviewPage />;
      case "/products": return <ProductsPage />;
      default: return <Dashboard />;
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="p-6 overflow-auto">{renderRoute()}</main>

        {/* toast */}
        {toast && (
          <div className="fixed right-6 bottom-6 bg-black text-white px-4 py-2 rounded shadow">{toast}</div>
        )}
      </div>
    </div>
  );
}

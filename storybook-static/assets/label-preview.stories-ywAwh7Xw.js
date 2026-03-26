import{n as e}from"./chunk-vNrZSFDR.js";import{_ as t}from"./iframe-BgtsNA66.js";import{n,t as r}from"./utils-CfjevCzH.js";function i({barcode:e,size:t=`small`,className:n}){return(0,a.jsxs)(`div`,{role:`button`,tabIndex:0,onClick:()=>window.print(),onKeyDown:e=>e.key===`Enter`&&window.print(),className:r(`flex cursor-pointer flex-col justify-between rounded-md border-2 border-dashed border-gray-300 bg-white p-3 font-mono text-xs shadow-sm transition hover:border-primary`,t===`small`?`h-[114px] w-[189px]`:`h-[265px] w-[378px]`,n),children:[(0,a.jsxs)(`div`,{className:`flex items-start justify-between`,children:[(0,a.jsx)(`span`,{className:`rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide`,children:e.entityType}),(0,a.jsx)(`span`,{className:`text-[10px] text-gray-500`,children:e.id.slice(-6)})]}),e.sku&&(0,a.jsx)(`p`,{className:`mt-1 truncate font-semibold`,children:e.sku}),(0,a.jsxs)(`p`,{className:`text-gray-600`,children:[e.dimensions.lengthMm,` × `,e.dimensions.widthMm,` ×`,` `,e.dimensions.thicknessMm,` mm`]}),(0,a.jsxs)(`div`,{className:`flex justify-between text-gray-500`,children:[(0,a.jsxs)(`span`,{children:[`LOT: `,e.lot]}),e.location&&(0,a.jsx)(`span`,{children:e.location})]}),(0,a.jsx)(`p`,{className:`mt-1 text-center text-[9px] text-gray-400`,children:`Nhấn để in`})]})}var a,o=e((()=>{a=t(),n(),i.__docgenInfo={description:`Print-preview for a barcode label.
"small" = 50×30mm (remnant), "large" = 100×70mm (WIP).
Clicking the label triggers window.print() for browser print dialog.`,methods:[],displayName:`LabelPreview`,props:{barcode:{required:!0,tsType:{name:`BarcodeRecord`},description:``},size:{required:!1,tsType:{name:`union`,raw:`'small' | 'large'`,elements:[{name:`literal`,value:`'small'`},{name:`literal`,value:`'large'`}]},description:``,defaultValue:{value:`'small'`,computed:!1}},className:{required:!1,tsType:{name:`string`},description:``}}}})),s,c,l,u,d,f,p,m,h,g;e((()=>{s=t(),o(),c={id:`bc-0001-0001-0001-0001`,entityType:`WIP`,entityId:`wip-001`,sku:`PLY-18-A-WG`,dimensions:{lengthMm:600,widthMm:300,thicknessMm:18},lot:`L2024-01`,location:`A-01`,qrContent:`https://wms.vmarble.vn/bc/bc-0001`,createdAt:`2024-01-15T08:00:00Z`},l={id:`bc-0002-0002-0002-0002`,entityType:`REMNANT`,entityId:`rem-002`,sku:null,dimensions:{lengthMm:350,widthMm:200,thicknessMm:18},lot:`L2024-01`,location:null,qrContent:`https://wms.vmarble.vn/bc/bc-0002`,createdAt:`2024-01-16T10:30:00Z`},u={title:`Kiosk/LabelPreview`,component:i,tags:[`autodocs`],parameters:{viewport:{defaultViewport:`mobile375`},backgrounds:{default:`light`}},argTypes:{size:{control:`select`,options:[`small`,`large`]}}},d={name:`Small label — WIP (50×30mm)`,args:{barcode:c,size:`small`}},f={name:`Large label — WIP (100×70mm)`,args:{barcode:c,size:`large`}},p={name:`Small label — Remnant (no SKU, no location)`,args:{barcode:l,size:`small`}},m={name:`Large label — Remnant`,args:{barcode:l,size:`large`}},h={name:`Both sizes side by side`,render:()=>(0,s.jsxs)(`div`,{className:`flex flex-wrap gap-6 p-4`,children:[(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`p`,{className:`mb-2 text-xs text-muted-foreground`,children:`Small (50×30mm)`}),(0,s.jsx)(i,{barcode:c,size:`small`})]}),(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`p`,{className:`mb-2 text-xs text-muted-foreground`,children:`Large (100×70mm)`}),(0,s.jsx)(i,{barcode:c,size:`large`})]})]})},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  name: 'Small label — WIP (50×30mm)',
  args: {
    barcode: BARCODE_WIP,
    size: 'small'
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  name: 'Large label — WIP (100×70mm)',
  args: {
    barcode: BARCODE_WIP,
    size: 'large'
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  name: 'Small label — Remnant (no SKU, no location)',
  args: {
    barcode: BARCODE_REMNANT,
    size: 'small'
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  name: 'Large label — Remnant',
  args: {
    barcode: BARCODE_REMNANT,
    size: 'large'
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  name: 'Both sizes side by side',
  render: () => <div className="flex flex-wrap gap-6 p-4">
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Small (50×30mm)</p>
        <LabelPreview barcode={BARCODE_WIP} size="small" />
      </div>
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Large (100×70mm)</p>
        <LabelPreview barcode={BARCODE_WIP} size="large" />
      </div>
    </div>
}`,...h.parameters?.docs?.source}}},g=[`SmallWIP`,`LargeWIP`,`SmallRemnant`,`LargeRemnant`,`SideBySide`]}))();export{m as LargeRemnant,f as LargeWIP,h as SideBySide,p as SmallRemnant,d as SmallWIP,g as __namedExportsOrder,u as default};
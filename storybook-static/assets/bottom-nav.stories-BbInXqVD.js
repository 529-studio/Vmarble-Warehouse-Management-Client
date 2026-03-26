import{n as e,o as t}from"./chunk-vNrZSFDR.js";import{_ as n,b as r,x as i}from"./iframe-BgtsNA66.js";import{_ as a,c as o,l as s,s as c,t as l}from"./lucide-react-DnM_rwBX.js";import{n as u,t as d}from"./utils-CfjevCzH.js";import{t as f}from"./link-DCVY4WfX.js";function p(){let e=i();return(0,m.jsx)(`nav`,{className:`fixed bottom-0 left-0 right-0 z-20 flex h-16 items-center justify-around border-t bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.08)]`,children:g.map(({href:t,label:n,icon:r})=>{let i=e.startsWith(t);return(0,m.jsxs)(h.default,{href:t,className:d(`flex min-w-[4rem] flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors`,i?`text-primary`:`text-muted-foreground hover:text-foreground`),children:[(0,m.jsx)(r,{className:d(`size-6`,i&&`stroke-[2.5]`),"aria-hidden":`true`}),(0,m.jsx)(`span`,{children:n})]},t)})})}var m,h,g,_=e((()=>{m=n(),h=t(f()),r(),l(),u(),g=[{href:`/cutting-orders`,label:`Lệnh cắt`,icon:a},{href:`/report-cut`,label:`Báo cáo`,icon:c},{href:`/remnant-list`,label:`Kho tấm lẻ`,icon:s},{href:`/scan`,label:`Quét mã`,icon:o}],p.__docgenInfo={description:``,methods:[],displayName:`BottomNav`}})),v,y,b,x,S,C,w,T;e((()=>{v=n(),_(),y={title:`Kiosk/BottomNav`,component:p,tags:[`autodocs`],parameters:{viewport:{defaultViewport:`mobile375`},nextjs:{appDirectory:!0,navigation:{pathname:`/cutting-orders`}},layout:`fullscreen`}},b={name:`Active: Lệnh cắt`,parameters:{nextjs:{appDirectory:!0,navigation:{pathname:`/cutting-orders`}}}},x={name:`Active: Báo cáo`,parameters:{nextjs:{appDirectory:!0,navigation:{pathname:`/report-cut`}}}},S={name:`Active: Kho tấm lẻ`,parameters:{nextjs:{appDirectory:!0,navigation:{pathname:`/remnant-list`}}}},C={name:`Active: Quét mã`,parameters:{nextjs:{appDirectory:!0,navigation:{pathname:`/scan`}}}},w={name:`Trong layout trang (có padding-bottom)`,parameters:{nextjs:{appDirectory:!0,navigation:{pathname:`/cutting-orders`}}},render:()=>(0,v.jsxs)(`div`,{className:`min-h-[812px] bg-background pb-16`,children:[(0,v.jsx)(`main`,{className:`p-4`,children:(0,v.jsx)(`p`,{className:`text-sm text-muted-foreground`,children:`Nội dung trang — BottomNav cố định ở dưới cùng.`})}),(0,v.jsx)(p,{})]})},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  name: 'Active: Lệnh cắt',
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/cutting-orders'
      }
    }
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  name: 'Active: Báo cáo',
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/report-cut'
      }
    }
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  name: 'Active: Kho tấm lẻ',
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/remnant-list'
      }
    }
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  name: 'Active: Quét mã',
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/scan'
      }
    }
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  name: 'Trong layout trang (có padding-bottom)',
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/cutting-orders'
      }
    }
  },
  render: () => <div className="min-h-[812px] bg-background pb-16">
      <main className="p-4">
        <p className="text-sm text-muted-foreground">
          Nội dung trang — BottomNav cố định ở dưới cùng.
        </p>
      </main>
      <BottomNav />
    </div>
}`,...w.parameters?.docs?.source}}},T=[`CuttingOrdersActive`,`ReportActive`,`RemnantsActive`,`ScanActive`,`WithPageContent`]}))();export{b as CuttingOrdersActive,S as RemnantsActive,x as ReportActive,C as ScanActive,w as WithPageContent,T as __namedExportsOrder,y as default};
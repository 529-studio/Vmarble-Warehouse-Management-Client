import{n as e,o as t}from"./chunk-vNrZSFDR.js";import{_ as n,b as r,x as i}from"./iframe-BgtsNA66.js";import{g as a,l as o,p as s,t as c}from"./lucide-react-DnM_rwBX.js";import{n as l,t as u}from"./utils-CfjevCzH.js";import{t as d}from"./link-DCVY4WfX.js";import{n as f,t as p}from"./separator-D9YBii3E.js";function m(){let e=i();return(0,h.jsxs)(`aside`,{className:`fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r bg-sidebar`,children:[(0,h.jsx)(`div`,{className:`flex h-16 items-center px-5`,children:(0,h.jsx)(`span`,{className:`text-base font-bold text-sidebar-foreground`,children:`Vmarble WMS`})}),(0,h.jsx)(p,{}),(0,h.jsx)(`nav`,{className:`flex flex-col gap-1 p-3`,children:_.map(({href:t,label:n,icon:r})=>(0,h.jsxs)(g.default,{href:t,className:u(`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors`,e.startsWith(t)?`bg-sidebar-accent text-sidebar-accent-foreground`:`text-sidebar-foreground hover:bg-sidebar-accent/60`),children:[(0,h.jsx)(r,{className:`size-5 shrink-0`,"aria-hidden":`true`}),n]},t))})]})}var h,g,_,v=e((()=>{h=n(),g=t(d()),r(),c(),l(),f(),_=[{href:`/overview`,label:`Tổng quan`,icon:s},{href:`/remnants`,label:`Kho tấm lẻ`,icon:o},{href:`/costing`,label:`Giá thành`,icon:a}],m.__docgenInfo={description:``,methods:[],displayName:`SideNav`}})),y,b,x,S,C,w,T;e((()=>{y=n(),v(),b={title:`Dashboard/SideNav`,component:m,tags:[`autodocs`],parameters:{viewport:{defaultViewport:`desktop1280`},layout:`fullscreen`,nextjs:{appDirectory:!0,navigation:{pathname:`/overview`}}}},x={name:`Active: Tổng quan`,parameters:{nextjs:{appDirectory:!0,navigation:{pathname:`/overview`}}}},S={name:`Active: Kho tấm lẻ`,parameters:{nextjs:{appDirectory:!0,navigation:{pathname:`/remnants`}}}},C={name:`Active: Giá thành`,parameters:{nextjs:{appDirectory:!0,navigation:{pathname:`/costing`}}}},w={name:`Trong layout trang (với main content)`,parameters:{nextjs:{appDirectory:!0,navigation:{pathname:`/overview`}}},render:()=>(0,y.jsxs)(`div`,{className:`min-h-screen bg-background`,children:[(0,y.jsx)(m,{}),(0,y.jsxs)(`main`,{className:`ml-60 p-6`,children:[(0,y.jsx)(`h1`,{className:`text-2xl font-bold`,children:`Tổng quan`}),(0,y.jsx)(`p`,{className:`mt-2 text-sm text-muted-foreground`,children:`Nội dung dashboard — SideNav chiếm 240px bên trái.`})]})]})},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  name: 'Active: Tổng quan',
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/overview'
      }
    }
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  name: 'Active: Kho tấm lẻ',
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/remnants'
      }
    }
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  name: 'Active: Giá thành',
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/costing'
      }
    }
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  name: 'Trong layout trang (với main content)',
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/overview'
      }
    }
  },
  render: () => <div className="min-h-screen bg-background">
      <SideNav />
      <main className="ml-60 p-6">
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nội dung dashboard — SideNav chiếm 240px bên trái.
        </p>
      </main>
    </div>
}`,...w.parameters?.docs?.source}}},T=[`OverviewActive`,`RemnantsActive`,`CostingActive`,`WithPageContent`]}))();export{C as CostingActive,x as OverviewActive,S as RemnantsActive,w as WithPageContent,T as __namedExportsOrder,b as default};
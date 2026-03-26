import{n as e}from"./chunk-vNrZSFDR.js";import{_ as t}from"./iframe-BgtsNA66.js";import{n,t as r}from"./utils-CfjevCzH.js";function i({className:e,...t}){return(0,a.jsx)(`div`,{"data-slot":`skeleton`,className:r(`bg-accent animate-pulse rounded-md`,e),...t})}var a,o=e((()=>{a=t(),n(),i.__docgenInfo={description:``,methods:[],displayName:`Skeleton`}})),s,c,l,u,d,f,p;e((()=>{s=t(),o(),c={title:`UI/Skeleton`,component:i,tags:[`autodocs`]},l={render:()=>(0,s.jsx)(i,{className:`h-4 w-[250px]`})},u={name:`Card loading skeleton`,render:()=>(0,s.jsxs)(`div`,{className:`flex flex-col space-y-3 w-[360px]`,children:[(0,s.jsx)(i,{className:`h-[180px] w-full rounded-xl`}),(0,s.jsxs)(`div`,{className:`space-y-2`,children:[(0,s.jsx)(i,{className:`h-4 w-3/4`}),(0,s.jsx)(i,{className:`h-4 w-1/2`})]})]})},d={name:`Table row loading skeleton`,render:()=>(0,s.jsx)(`div`,{className:`space-y-2 w-full max-w-xl`,children:Array.from({length:4}).map((e,t)=>(0,s.jsxs)(`div`,{className:`flex gap-4`,children:[(0,s.jsx)(i,{className:`h-5 w-1/4`}),(0,s.jsx)(i,{className:`h-5 w-1/4`}),(0,s.jsx)(i,{className:`h-5 w-1/4`}),(0,s.jsx)(i,{className:`h-5 w-1/4`})]},t))})},f={name:`StatCard loading skeleton`,render:()=>(0,s.jsx)(`div`,{className:`flex gap-4`,children:Array.from({length:3}).map((e,t)=>(0,s.jsxs)(`div`,{className:`flex flex-col gap-3 rounded-xl border p-5 w-[200px]`,children:[(0,s.jsx)(i,{className:`h-4 w-24`}),(0,s.jsx)(i,{className:`h-8 w-16`}),(0,s.jsx)(i,{className:`h-3 w-32`})]},t))})},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <Skeleton className="h-4 w-[250px]" />
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  name: 'Card loading skeleton',
  render: () => <div className="flex flex-col space-y-3 w-[360px]">
      <Skeleton className="h-[180px] w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  name: 'Table row loading skeleton',
  render: () => <div className="space-y-2 w-full max-w-xl">
      {Array.from({
      length: 4
    }).map((_, i) => <div key={i} className="flex gap-4">
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-5 w-1/4" />
        </div>)}
    </div>
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  name: 'StatCard loading skeleton',
  render: () => <div className="flex gap-4">
      {Array.from({
      length: 3
    }).map((_, i) => <div key={i} className="flex flex-col gap-3 rounded-xl border p-5 w-[200px]">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>)}
    </div>
}`,...f.parameters?.docs?.source}}},p=[`Default`,`CardSkeleton`,`TableRowSkeleton`,`StatCardSkeleton`]}))();export{u as CardSkeleton,l as Default,f as StatCardSkeleton,d as TableRowSkeleton,p as __namedExportsOrder,c as default};
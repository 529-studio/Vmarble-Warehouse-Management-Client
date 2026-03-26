import{n as e}from"./chunk-vNrZSFDR.js";import{_ as t}from"./iframe-BgtsNA66.js";import{n,t as r}from"./badge-oQnvznoL.js";var i,a,o,s,c,l;e((()=>{i=t(),n(),a={title:`UI/Badge`,component:r,tags:[`autodocs`],argTypes:{variant:{control:`select`,options:[`default`,`secondary`,`destructive`,`outline`]}}},o={args:{children:`Badge`}},s={render:()=>(0,i.jsxs)(`div`,{className:`flex flex-wrap gap-2`,children:[(0,i.jsx)(r,{variant:`default`,children:`Default`}),(0,i.jsx)(r,{variant:`secondary`,children:`Secondary`}),(0,i.jsx)(r,{variant:`destructive`,children:`Destructive`}),(0,i.jsx)(r,{variant:`outline`,children:`Outline`})]})},c={name:`Status Badges (WMS use-case)`,render:()=>(0,i.jsxs)(`div`,{className:`flex flex-wrap gap-2`,children:[(0,i.jsx)(r,{variant:`default`,children:`AVAILABLE`}),(0,i.jsx)(r,{variant:`secondary`,children:`ALLOCATED`}),(0,i.jsx)(r,{variant:`outline`,children:`PLANNED`}),(0,i.jsx)(r,{variant:`destructive`,children:`DEPLETED`})]})},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Badge'
  }
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  name: 'Status Badges (WMS use-case)',
  render: () => <div className="flex flex-wrap gap-2">
      <Badge variant="default">AVAILABLE</Badge>
      <Badge variant="secondary">ALLOCATED</Badge>
      <Badge variant="outline">PLANNED</Badge>
      <Badge variant="destructive">DEPLETED</Badge>
    </div>
}`,...c.parameters?.docs?.source}}},l=[`Default`,`AllVariants`,`StatusBadges`]}))();export{s as AllVariants,o as Default,c as StatusBadges,l as __namedExportsOrder,a as default};
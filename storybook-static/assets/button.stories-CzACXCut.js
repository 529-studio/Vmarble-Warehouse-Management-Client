import{n as e}from"./chunk-vNrZSFDR.js";import{_ as t}from"./iframe-BgtsNA66.js";import{d as n,f as r,o as i,t as a}from"./lucide-react-DnM_rwBX.js";import{n as o,t as s}from"./button-b57SCueb.js";var c,l,u,d,f,p,m,h;e((()=>{c=t(),a(),o(),l={title:`UI/Button`,component:s,tags:[`autodocs`],argTypes:{variant:{control:`select`,options:[`default`,`destructive`,`outline`,`secondary`,`ghost`,`link`]},size:{control:`select`,options:[`default`,`sm`,`lg`,`icon`]},disabled:{control:`boolean`},asChild:{control:`boolean`}}},u={args:{children:`Button`}},d={render:()=>(0,c.jsxs)(`div`,{className:`flex flex-wrap gap-3`,children:[(0,c.jsx)(s,{variant:`default`,children:`Default`}),(0,c.jsx)(s,{variant:`destructive`,children:`Destructive`}),(0,c.jsx)(s,{variant:`outline`,children:`Outline`}),(0,c.jsx)(s,{variant:`secondary`,children:`Secondary`}),(0,c.jsx)(s,{variant:`ghost`,children:`Ghost`}),(0,c.jsx)(s,{variant:`link`,children:`Link`})]})},f={render:()=>(0,c.jsxs)(`div`,{className:`flex flex-wrap items-center gap-3`,children:[(0,c.jsx)(s,{size:`sm`,children:`Small`}),(0,c.jsx)(s,{size:`default`,children:`Default`}),(0,c.jsx)(s,{size:`lg`,children:`Large`}),(0,c.jsx)(s,{size:`icon`,children:(0,c.jsx)(n,{})})]})},p={render:()=>(0,c.jsxs)(`div`,{className:`flex flex-wrap gap-3`,children:[(0,c.jsxs)(s,{children:[(0,c.jsx)(n,{}),` Gửi email`]}),(0,c.jsxs)(s,{variant:`destructive`,children:[(0,c.jsx)(i,{}),` Xoá`]}),(0,c.jsxs)(s,{variant:`outline`,children:[(0,c.jsx)(r,{className:`animate-spin`}),` Đang tải...`]})]})},m={render:()=>(0,c.jsxs)(`div`,{className:`flex flex-wrap gap-3`,children:[(0,c.jsx)(s,{disabled:!0,children:`Default`}),(0,c.jsx)(s,{disabled:!0,variant:`destructive`,children:`Destructive`}),(0,c.jsx)(s,{disabled:!0,variant:`outline`,children:`Outline`})]})},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Button'
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-3">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">
        <Mail />
      </Button>
    </div>
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-3">
      <Button>
        <Mail /> Gửi email
      </Button>
      <Button variant="destructive">
        <Trash2 /> Xoá
      </Button>
      <Button variant="outline">
        <Loader2 className="animate-spin" /> Đang tải...
      </Button>
    </div>
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-3">
      <Button disabled>Default</Button>
      <Button disabled variant="destructive">Destructive</Button>
      <Button disabled variant="outline">Outline</Button>
    </div>
}`,...m.parameters?.docs?.source}}},h=[`Default`,`AllVariants`,`AllSizes`,`WithIcon`,`Disabled`]}))();export{f as AllSizes,d as AllVariants,u as Default,m as Disabled,p as WithIcon,h as __namedExportsOrder,l as default};
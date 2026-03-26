import{n as e}from"./chunk-vNrZSFDR.js";import{_ as t}from"./iframe-BgtsNA66.js";import{n,t as r}from"./utils-CfjevCzH.js";function i({className:e,variant:t=`primary`,disabled:n,children:i,...o}){return(0,a.jsx)(`button`,{disabled:n,className:r(`flex min-h-[56px] w-full items-center justify-center rounded-xl px-6 text-lg font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50`,t===`primary`&&`bg-primary text-primary-foreground shadow-sm hover:bg-primary/90`,t===`secondary`&&`bg-secondary text-secondary-foreground hover:bg-secondary/80`,t===`danger`&&`bg-destructive text-white hover:bg-destructive/90`,e),...o,children:i})}var a,o=e((()=>{a=t(),n(),i.__docgenInfo={description:`Large touch-friendly button for kiosk use.
Minimum height 56px, full width, font size 18px.
Touch targets meet the ≥ 48px accessibility guideline.`,methods:[],displayName:`BigButton`,props:{variant:{required:!1,tsType:{name:`union`,raw:`'primary' | 'secondary' | 'danger'`,elements:[{name:`literal`,value:`'primary'`},{name:`literal`,value:`'secondary'`},{name:`literal`,value:`'danger'`}]},description:``,defaultValue:{value:`'primary'`,computed:!1}}}}})),s,c,l,u,d,f,p,m;e((()=>{s=t(),o(),c={title:`Kiosk/BigButton`,component:i,tags:[`autodocs`],parameters:{viewport:{defaultViewport:`mobile375`}},argTypes:{variant:{control:`select`,options:[`primary`,`secondary`,`danger`]},disabled:{control:`boolean`}}},l={args:{children:`Báo cáo hoàn thành`,variant:`primary`}},u={args:{children:`Xem chi tiết`,variant:`secondary`}},d={args:{children:`Hủy lệnh cắt`,variant:`danger`}},f={args:{children:`Không thể nhấn`,variant:`primary`,disabled:!0}},p={render:()=>(0,s.jsxs)(`div`,{className:`flex flex-col gap-4 w-[375px] p-4`,children:[(0,s.jsx)(i,{variant:`primary`,children:`Báo cáo hoàn thành`}),(0,s.jsx)(i,{variant:`secondary`,children:`Xem chi tiết lệnh`}),(0,s.jsx)(i,{variant:`danger`,children:`Hủy lệnh cắt`}),(0,s.jsx)(i,{variant:`primary`,disabled:!0,children:`Không thể nhấn`})]})},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Báo cáo hoàn thành',
    variant: 'primary'
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Xem chi tiết',
    variant: 'secondary'
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Hủy lệnh cắt',
    variant: 'danger'
  }
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    children: 'Không thể nhấn',
    variant: 'primary',
    disabled: true
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-4 w-[375px] p-4">
      <BigButton variant="primary">Báo cáo hoàn thành</BigButton>
      <BigButton variant="secondary">Xem chi tiết lệnh</BigButton>
      <BigButton variant="danger">Hủy lệnh cắt</BigButton>
      <BigButton variant="primary" disabled>Không thể nhấn</BigButton>
    </div>
}`,...p.parameters?.docs?.source}}},m=[`Primary`,`Secondary`,`Danger`,`Disabled`,`AllVariants`]}))();export{p as AllVariants,d as Danger,f as Disabled,l as Primary,u as Secondary,m as __namedExportsOrder,c as default};
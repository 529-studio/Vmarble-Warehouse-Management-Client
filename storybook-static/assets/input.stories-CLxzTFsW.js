import{n as e}from"./chunk-vNrZSFDR.js";import{_ as t}from"./iframe-BgtsNA66.js";import{n,t as r}from"./input-Bz-xJmzj.js";import{n as i,t as a}from"./label-B8GSJFPk.js";var o,s,c,l,u,d,f,p,m;e((()=>{o=t(),i(),n(),s={title:`UI/Input`,component:r,tags:[`autodocs`],argTypes:{type:{control:`select`,options:[`text`,`email`,`password`,`number`,`search`,`file`]},disabled:{control:`boolean`},placeholder:{control:`text`}}},c={args:{placeholder:`Nhập văn bản...`}},l={render:()=>(0,o.jsxs)(`div`,{className:`grid w-full max-w-sm gap-1.5`,children:[(0,o.jsx)(a,{htmlFor:`sku`,children:`Mã SKU`}),(0,o.jsx)(r,{id:`sku`,placeholder:`VD: PLY-18-A-WG`})]})},u={args:{disabled:!0,value:`Giá trị không thể chỉnh sửa`}},d={render:()=>(0,o.jsxs)(`div`,{className:`grid w-full max-w-sm gap-1.5`,children:[(0,o.jsx)(a,{htmlFor:`thickness`,children:`Độ dày (mm)`}),(0,o.jsx)(r,{id:`thickness`,type:`number`,placeholder:`18`,min:1,max:100})]})},f={render:()=>(0,o.jsxs)(`div`,{className:`grid w-full max-w-sm gap-1.5`,children:[(0,o.jsx)(a,{htmlFor:`lot`,children:`Số lô`}),(0,o.jsx)(r,{id:`lot`,"aria-invalid":`true`,defaultValue:`INVALID-LOT`}),(0,o.jsx)(`p`,{className:`text-sm text-destructive`,children:`Số lô không đúng định dạng.`})]})},p={render:()=>(0,o.jsxs)(`div`,{className:`grid w-full max-w-sm gap-1.5`,children:[(0,o.jsx)(a,{htmlFor:`file`,children:`Tải file`}),(0,o.jsx)(r,{id:`file`,type:`file`})]})},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: 'Nhập văn bản...'
  }
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="sku">Mã SKU</Label>
      <Input id="sku" placeholder="VD: PLY-18-A-WG" />
    </div>
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    value: 'Giá trị không thể chỉnh sửa'
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="thickness">Độ dày (mm)</Label>
      <Input id="thickness" type="number" placeholder="18" min={1} max={100} />
    </div>
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="lot">Số lô</Label>
      <Input id="lot" aria-invalid="true" defaultValue="INVALID-LOT" />
      <p className="text-sm text-destructive">Số lô không đúng định dạng.</p>
    </div>
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="file">Tải file</Label>
      <Input id="file" type="file" />
    </div>
}`,...p.parameters?.docs?.source}}},m=[`Default`,`WithLabel`,`Disabled`,`NumberInput`,`ErrorState`,`FileUpload`]}))();export{c as Default,u as Disabled,f as ErrorState,p as FileUpload,d as NumberInput,l as WithLabel,m as __namedExportsOrder,s as default};
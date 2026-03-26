import{n as e}from"./chunk-vNrZSFDR.js";import{_ as t}from"./iframe-BgtsNA66.js";import{t as n,v as r,y as i}from"./lucide-react-DnM_rwBX.js";import{i as a,n as o,r as s,t as c}from"./alert-CrvrV-98.js";var l,u,d,f,p,m,h;e((()=>{l=t(),n(),a(),u={title:`UI/Alert`,component:c,tags:[`autodocs`],argTypes:{variant:{control:`select`,options:[`default`,`destructive`]}}},d={render:()=>(0,l.jsxs)(c,{children:[(0,l.jsx)(r,{className:`size-4`}),(0,l.jsx)(s,{children:`Thành công`}),(0,l.jsx)(o,{children:`Thao tác đã được thực hiện thành công.`})]})},f={render:()=>(0,l.jsxs)(c,{variant:`destructive`,children:[(0,l.jsx)(i,{className:`size-4`}),(0,l.jsx)(s,{children:`Lỗi`}),(0,l.jsx)(o,{children:`Có lỗi xảy ra. Vui lòng thử lại.`})]})},p={render:()=>(0,l.jsxs)(c,{children:[(0,l.jsx)(s,{children:`Thông báo`}),(0,l.jsx)(o,{children:`Alert không có icon — dùng khi không cần nhấn mạnh loại thông báo.`})]})},m={render:()=>(0,l.jsx)(c,{children:(0,l.jsx)(o,{children:`Chỉ có mô tả, không có tiêu đề.`})})},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <Alert>
      <CheckCircle className="size-4" />
      <AlertTitle>Thành công</AlertTitle>
      <AlertDescription>Thao tác đã được thực hiện thành công.</AlertDescription>
    </Alert>
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertTitle>Lỗi</AlertTitle>
      <AlertDescription>Có lỗi xảy ra. Vui lòng thử lại.</AlertDescription>
    </Alert>
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <Alert>
      <AlertTitle>Thông báo</AlertTitle>
      <AlertDescription>
        Alert không có icon — dùng khi không cần nhấn mạnh loại thông báo.
      </AlertDescription>
    </Alert>
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <Alert>
      <AlertDescription>
        Chỉ có mô tả, không có tiêu đề.
      </AlertDescription>
    </Alert>
}`,...m.parameters?.docs?.source}}},h=[`Default`,`Destructive`,`WithoutIcon`,`DescriptionOnly`]}))();export{d as Default,m as DescriptionOnly,f as Destructive,p as WithoutIcon,h as __namedExportsOrder,u as default};
import{n as e}from"./chunk-vNrZSFDR.js";import{_ as t}from"./iframe-BgtsNA66.js";import{a as n,g as r,i,l as a,m as o,t as s,u as c}from"./lucide-react-DnM_rwBX.js";import{n as l,t as u}from"./utils-CfjevCzH.js";import{n as d,s as f,t as p}from"./card-BVQO9hHF.js";function m({title:e,value:t,description:n,icon:r,trend:i,className:a}){return(0,h.jsx)(p,{className:u(`gap-4 py-5`,a),children:(0,h.jsx)(d,{className:`px-5`,children:(0,h.jsxs)(`div`,{className:`flex items-start justify-between gap-2`,children:[(0,h.jsxs)(`div`,{className:`space-y-1`,children:[(0,h.jsx)(`p`,{className:`text-sm font-medium text-muted-foreground`,children:e}),(0,h.jsx)(`p`,{className:`text-2xl font-bold leading-none`,children:t}),n&&(0,h.jsx)(`p`,{className:`text-xs text-muted-foreground`,children:n})]}),r&&(0,h.jsx)(`div`,{className:`rounded-lg bg-muted p-2`,children:(0,h.jsx)(r,{className:u(`size-5`,i===`up`&&`text-green-600`,i===`down`&&`text-destructive`,i===`neutral`&&`text-muted-foreground`,!i&&`text-muted-foreground`)})})]})})})}var h,g=e((()=>{h=t(),l(),f(),m.__docgenInfo={description:``,methods:[],displayName:`StatCard`,props:{title:{required:!0,tsType:{name:`string`},description:``},value:{required:!0,tsType:{name:`union`,raw:`string | number`,elements:[{name:`string`},{name:`number`}]},description:``},description:{required:!1,tsType:{name:`string`},description:``},icon:{required:!1,tsType:{name:`LucideIcon`},description:``},trend:{required:!1,tsType:{name:`union`,raw:`'up' | 'down' | 'neutral'`,elements:[{name:`literal`,value:`'up'`},{name:`literal`,value:`'down'`},{name:`literal`,value:`'neutral'`}]},description:``},className:{required:!1,tsType:{name:`string`},description:``}}}})),_,v,y,b,x,S,C,w,T;e((()=>{_=t(),s(),g(),v={title:`Dashboard/StatCard`,component:m,tags:[`autodocs`],parameters:{viewport:{defaultViewport:`desktop1280`}},argTypes:{trend:{control:`select`,options:[`up`,`down`,`neutral`,void 0]}}},y={args:{title:`Tổng tấm lẻ`,value:`148`,description:`Hiện có trong kho`,icon:a}},b={args:{title:`Tỷ lệ tái sử dụng`,value:`73.2%`,description:`+5.4% so với tháng trước`,icon:i,trend:`up`}},x={args:{title:`Tấm hết hạn`,value:`12`,description:`–3 so với tuần trước`,icon:n,trend:`down`}},S={args:{title:`Tổng lệnh cắt`,value:`64`,description:`Không đổi so với hôm qua`,icon:c,trend:`neutral`}},C={args:{title:`Diện tích tổng`,value:`24.5 m²`,description:`Tổng diện tích tấm lẻ khả dụng`}},w={name:`Dashboard grid (4 cards)`,render:()=>(0,_.jsxs)(`div`,{className:`grid grid-cols-4 gap-4 p-4`,children:[(0,_.jsx)(m,{title:`Tổng tấm lẻ`,value:`148`,icon:a,trend:`neutral`,description:`Trong kho`}),(0,_.jsx)(m,{title:`Tỷ lệ tái sử dụng`,value:`73.2%`,icon:i,trend:`up`,description:`+5.4% tháng này`}),(0,_.jsx)(m,{title:`Tấm hết hạn`,value:`12`,icon:o,trend:`down`,description:`Cần xử lý`}),(0,_.jsx)(m,{title:`Giá trị tồn kho`,value:`₫48.2M`,icon:r,trend:`neutral`,description:`Ước tính`})]})},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Tổng tấm lẻ',
    value: '148',
    description: 'Hiện có trong kho',
    icon: Package
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Tỷ lệ tái sử dụng',
    value: '73.2%',
    description: '+5.4% so với tháng trước',
    icon: TrendingUp,
    trend: 'up'
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Tấm hết hạn',
    value: '12',
    description: '–3 so với tuần trước',
    icon: TrendingDown,
    trend: 'down'
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Tổng lệnh cắt',
    value: '64',
    description: 'Không đổi so với hôm qua',
    icon: Minus,
    trend: 'neutral'
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Diện tích tổng',
    value: '24.5 m²',
    description: 'Tổng diện tích tấm lẻ khả dụng'
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  name: 'Dashboard grid (4 cards)',
  render: () => <div className="grid grid-cols-4 gap-4 p-4">
      <StatCard title="Tổng tấm lẻ" value="148" icon={Package} trend="neutral" description="Trong kho" />
      <StatCard title="Tỷ lệ tái sử dụng" value="73.2%" icon={TrendingUp} trend="up" description="+5.4% tháng này" />
      <StatCard title="Tấm hết hạn" value="12" icon={Layers} trend="down" description="Cần xử lý" />
      <StatCard title="Giá trị tồn kho" value="₫48.2M" icon={DollarSign} trend="neutral" description="Ước tính" />
    </div>
}`,...w.parameters?.docs?.source}}},T=[`Default`,`TrendUp`,`TrendDown`,`TrendNeutral`,`NoIcon`,`DashboardGrid`]}))();export{w as DashboardGrid,y as Default,C as NoIcon,x as TrendDown,S as TrendNeutral,b as TrendUp,T as __namedExportsOrder,v as default};
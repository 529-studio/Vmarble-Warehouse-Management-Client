import{n as e}from"./chunk-vNrZSFDR.js";import{_ as t}from"./iframe-BgtsNA66.js";import{n,t as r}from"./utils-CfjevCzH.js";import{n as i,t as a}from"./badge-oQnvznoL.js";function o({className:e,...t}){return(0,m.jsx)(`div`,{"data-slot":`table-container`,className:`relative w-full overflow-x-auto`,children:(0,m.jsx)(`table`,{"data-slot":`table`,className:r(`w-full caption-bottom text-sm`,e),...t})})}function s({className:e,...t}){return(0,m.jsx)(`thead`,{"data-slot":`table-header`,className:r(`[&_tr]:border-b`,e),...t})}function c({className:e,...t}){return(0,m.jsx)(`tbody`,{"data-slot":`table-body`,className:r(`[&_tr:last-child]:border-0`,e),...t})}function l({className:e,...t}){return(0,m.jsx)(`tfoot`,{"data-slot":`table-footer`,className:r(`bg-muted/50 border-t font-medium [&>tr]:last:border-b-0`,e),...t})}function u({className:e,...t}){return(0,m.jsx)(`tr`,{"data-slot":`table-row`,className:r(`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted`,e),...t})}function d({className:e,...t}){return(0,m.jsx)(`th`,{"data-slot":`table-head`,className:r(`text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]`,e),...t})}function f({className:e,...t}){return(0,m.jsx)(`td`,{"data-slot":`table-cell`,className:r(`p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]`,e),...t})}function p({className:e,...t}){return(0,m.jsx)(`caption`,{"data-slot":`table-caption`,className:r(`text-muted-foreground mt-4 text-sm`,e),...t})}var m,h=e((()=>{m=t(),n(),o.__docgenInfo={description:``,methods:[],displayName:`Table`},s.__docgenInfo={description:``,methods:[],displayName:`TableHeader`},c.__docgenInfo={description:``,methods:[],displayName:`TableBody`},l.__docgenInfo={description:``,methods:[],displayName:`TableFooter`},d.__docgenInfo={description:``,methods:[],displayName:`TableHead`},u.__docgenInfo={description:``,methods:[],displayName:`TableRow`},f.__docgenInfo={description:``,methods:[],displayName:`TableCell`},p.__docgenInfo={description:``,methods:[],displayName:`TableCaption`}})),g,_,v,y,b,x,S;e((()=>{g=t(),i(),h(),_=[{id:`REM-001`,sku:`PLY-18-A`,dims:`600×300×18`,status:`AVAILABLE`,lot:`L2024-01`},{id:`REM-002`,sku:`MDF-12-B`,dims:`450×250×12`,status:`ALLOCATED`,lot:`L2024-02`},{id:`REM-003`,sku:`HDF-08-A`,dims:`800×400×8`,status:`USED`,lot:`L2024-01`},{id:`REM-004`,sku:`PLY-25-A`,dims:`350×200×25`,status:`AVAILABLE`,lot:`L2024-03`}],v=e=>e===`AVAILABLE`?`default`:e===`ALLOCATED`?`secondary`:e===`USED`?`outline`:`destructive`,y={title:`UI/Table`,component:o,tags:[`autodocs`]},b={name:`Remnant inventory table`,render:()=>(0,g.jsxs)(o,{children:[(0,g.jsx)(p,{children:`Danh sách tấm lẻ trong kho`}),(0,g.jsx)(s,{children:(0,g.jsxs)(u,{children:[(0,g.jsx)(d,{children:`ID`}),(0,g.jsx)(d,{children:`SKU`}),(0,g.jsx)(d,{children:`Kích thước (mm)`}),(0,g.jsx)(d,{children:`Lô`}),(0,g.jsx)(d,{children:`Trạng thái`})]})}),(0,g.jsx)(c,{children:_.map(e=>(0,g.jsxs)(u,{children:[(0,g.jsx)(f,{className:`font-mono text-xs`,children:e.id}),(0,g.jsx)(f,{children:e.sku}),(0,g.jsx)(f,{className:`font-mono text-xs`,children:e.dims}),(0,g.jsx)(f,{className:`text-muted-foreground`,children:e.lot}),(0,g.jsx)(f,{children:(0,g.jsx)(a,{variant:v(e.status),children:e.status})})]},e.id))})]})},x={name:`Empty state table`,render:()=>(0,g.jsxs)(o,{children:[(0,g.jsx)(s,{children:(0,g.jsxs)(u,{children:[(0,g.jsx)(d,{children:`ID`}),(0,g.jsx)(d,{children:`SKU`}),(0,g.jsx)(d,{children:`Trạng thái`})]})}),(0,g.jsx)(c,{children:(0,g.jsx)(u,{children:(0,g.jsx)(f,{colSpan:3,className:`text-center text-muted-foreground h-24`,children:`Không có dữ liệu`})})})]})},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  name: 'Remnant inventory table',
  render: () => <Table>
      <TableCaption>Danh sách tấm lẻ trong kho</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Kích thước (mm)</TableHead>
          <TableHead>Lô</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {REMNANTS.map(r => <TableRow key={r.id}>
            <TableCell className="font-mono text-xs">{r.id}</TableCell>
            <TableCell>{r.sku}</TableCell>
            <TableCell className="font-mono text-xs">{r.dims}</TableCell>
            <TableCell className="text-muted-foreground">{r.lot}</TableCell>
            <TableCell>
              <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
            </TableCell>
          </TableRow>)}
      </TableBody>
    </Table>
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  name: 'Empty state table',
  render: () => <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
            Không có dữ liệu
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
}`,...x.parameters?.docs?.source}}},S=[`RemnantTable`,`EmptyTable`]}))();export{x as EmptyTable,b as RemnantTable,S as __namedExportsOrder,y as default};
import React, {createContext, useContext} from 'react';
import {renderToString, renderToStaticMarkup} from 'react-dom/server.browser';
import {createStyleRegistry, StyleRegistry} from 'styled-jsx';
import {RouterContext} from 'next/dist/shared/lib/router-context.shared-runtime';
import {HeadManagerContext} from 'next/dist/shared/lib/head-manager-context.shared-runtime';
import App from '../pages/_app';
import Page from '../pages/product/[id]';
import Document from '../pages/_document';
import manifest from '../.next/build-manifest.json';
import build from 'localjagoff:build-id';

const DocumentContext=createContext(null);
export function useRouter(){return useContext(RouterContext);}
const safeJson=value=>JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,c=>
  ({'<':'\\u003c','>':'\\u003e','&':'\\u0026','\u2028':'\\u2028','\u2029':'\\u2029'})[c]);
const files=[...new Set([...manifest.pages['/_app'],...manifest.pages['/product/[id]'],...manifest.lowPriorityFiles])];

// The original Document retains the site's fonts and domain-verification tags.
export function Html(props){return <html {...props}/>;}
export function Head({children}){
  const state=useContext(DocumentContext);
  return <head>{children}{state.head}<meta name="next-head-count" content={state.head.length}/>
    {files.filter(f=>f.endsWith('.css')).map(f=><link key={f} rel="stylesheet" href={'/_next/'+f} data-n-g=""/>)}
    <noscript data-n-css=""/>{state.styles}
  </head>;
}
export function Main(){return <div id="__next" dangerouslySetInnerHTML={{__html:useContext(DocumentContext).html}}/>;}
export function NextScript(){
  const {data}=useContext(DocumentContext);
  return <>
    {manifest.polyfillFiles.map(f=><script key={f} defer noModule src={'/_next/'+f}/>)}
    <script id="__NEXT_DATA__" type="application/json" dangerouslySetInnerHTML={{__html:safeJson(data)}}/>
    {files.filter(f=>f.endsWith('.js')).map(f=><script key={f} src={'/_next/'+f} defer/>)}
  </>;
}
export function renderProduct(props,query){
  const styles=createStyleRegistry();
  let head=[];
  const pathname='/product/[id]',asPath='/product/'+props.initialProductId+
    (typeof query.variant==='string'?'?variant='+encodeURIComponent(query.variant):'');
  const router={pathname,route:pathname,query,asPath,basePath:'',isFallback:false,isReady:true,
    isPreview:false,isLocaleDomain:false,events:{on(){},off(){}}};
  const manager={mountedInstances:new Set(),updateHead(value){head=value;}};
  const html=renderToString(<RouterContext.Provider value={router}>
    <HeadManagerContext.Provider value={manager}><StyleRegistry registry={styles}>
      <App Component={Page} pageProps={props}/>
    </StyleRegistry></HeadManagerContext.Provider>
  </RouterContext.Provider>);
  const data={props:{pageProps:props,__N_SSP:true},page:pathname,query,buildId:build,
    isFallback:false,isExperimentalCompile:false,gssp:true,scriptLoader:[]};
  return '<!DOCTYPE html>'+renderToStaticMarkup(<DocumentContext.Provider value={{html,head,styles:styles.styles(),data}}>
    <Document/>
  </DocumentContext.Provider>);
}
export const buildId=build;
// Warm only pure component initialization at startup; no data fetch or user response.
renderProduct({initialProductId:'',initialProduct:null,initialVariantId:'',unavailable:true},{});

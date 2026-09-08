import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const dictionaryContext=vm.createContext({window:{}});
vm.runInContext(readFileSync(new URL('lang/hu.js',root),'utf8'),dictionaryContext);
const hungarian=dictionaryContext.window.XP_STRINGS.hu;
const keysByHungarian=new Map(Object.entries(hungarian).map(([key,value])=>[value,key]));

export function key(text){
 return keysByHungarian.get(text)??text;
}

export function hu(key,params){
 let text=hungarian[key]??key;
 if(params)text=text.replace(/\{(\w+)\}/g,(all,name)=>params[name]===undefined?all:String(params[name]));
 return text;
}

export function installHungarian(context){
 context.window.XP_STRINGS={hu:hungarian};
}

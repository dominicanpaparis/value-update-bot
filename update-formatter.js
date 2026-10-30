import { EmbedBuilder } from "discord.js";
const ATTRIBUTION = "Data from rblxvalue.com";
const MAX_DESCRIPTION = 3900;
function v(x){ if(x==null)return "—"; return typeof x==="number"?new Intl.NumberFormat("en-US").format(x):String(x); }
function delta(from,to){ if(typeof from!=="number"||typeof to!=="number")return ""; const d=to-from; return ` (${d>=0?"+":""}${v(d)})`; }
function collect(items,type){ const rows=[]; for(const item of items||[]) for(const c of item.changes||[]) if(c.type===type) rows.push({name:item.name,c}); return rows; }
function section(title, rows, type){ if(!rows.length)return ""; const body=rows.map(({name,c})=> type==="newly_added"?`**${name}** — ${v(c.to)}`:`**${name}**\n${v(c.from)} → ${v(c.to)}${type.startsWith("value_")?delta(c.from,c.to):type==="demand_changed"&&typeof c.from==="number"&&typeof c.to==="number"?(c.to>c.from?" ⬆️":c.to<c.from?" ⬇️":""):""}`).join("\n\n"); return `${title}\n\n${body}`; }
export function buildValueUpdateEmbeds(itemChanges,{preview=false,updatedAt=new Date()}={}){
 const inc=collect(itemChanges,"value_increased"), dec=collect(itemChanges,"value_decreased"), demand=collect(itemChanges,"demand_changed"), stability=collect(itemChanges,"stability_changed"), added=collect(itemChanges,"newly_added");
 const parts=[section("📈 **VALUE INCREASES**",inc,"value_increased"),section("📉 **VALUE DECREASES**",dec,"value_decreased"),section("🔥 **DEMAND CHANGES**",demand,"demand_changed"),section("⚖️ **STABILITY CHANGES**",stability,"stability_changed"),section("✨ **NEW ITEMS**",added,"newly_added")].filter(Boolean);
 const summary=`📋 **UPDATE SUMMARY**\n📈 ${inc.length} Increased • 📉 ${dec.length} Decreased\n🔥 ${demand.length} Demand • ⚖️ ${stability.length} Stability • ✨ ${added.length} New\n\n🔗 **View Values:** https://rblxvalue.com`;
 let text=[preview?"⚠️ **FAKE DEMO DATA — preview only. Nobody is pinged.**":"",...parts,summary].filter(Boolean).join("\n\n");
 if(text.length>MAX_DESCRIPTION) text=text.slice(0,MAX_DESCRIPTION-30)+"\n\n…More changes detected.";
 return [new EmbedBuilder().setColor(0x5865f2).setTitle("📊 VALUE UPDATE").setDescription(text).setFooter({text:preview?`${ATTRIBUTION} • TEST PREVIEW`:ATTRIBUTION}).setTimestamp(new Date(updatedAt))];
}
export function createDemoChanges(){return [
 {slug:"harvester",name:"Harvester",changes:[{type:"value_increased",from:1250,to:1300}]},
 {slug:"travelers-axe",name:"Traveler’s Axe",changes:[{type:"value_increased",from:7800,to:7900}]},
 {slug:"raygun",name:"Raygun",changes:[{type:"value_decreased",from:1800,to:1775}]},
 {slug:"demo-demand",name:"Example Item",changes:[{type:"demand_changed",from:4,to:6}]},
 {slug:"demo-stability",name:"Example Stability Item",changes:[{type:"stability_changed",from:"Stable",to:"Fluctuating"}]},
 {slug:"demo-new",name:"Example New Item",changes:[{type:"newly_added",from:null,to:1450}]},
];}

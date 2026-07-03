import { Franchise } from '@/types'
import { ROSTER_ROWS } from './players'

const ids = (rows: readonly (readonly unknown[])[]) => rows.map(r => r[0] as string)

export const FRANCHISES: Franchise[] = [
  { id:'MI',   name:'Mumbai Indians',            short_name:'MI',   league:'IPL', color:'#004BA0', logo_emoji:'🔵', playerIds: ids(ROSTER_ROWS.MI) },
  { id:'CSK',  name:'Chennai Super Kings',        short_name:'CSK',  league:'IPL', color:'#FFCB05', logo_emoji:'🟡', playerIds: ids(ROSTER_ROWS.CSK) },
  { id:'RCB',  name:'Royal Challengers Bengaluru',short_name:'RCB',  league:'IPL', color:'#EC1C24', logo_emoji:'🔴', playerIds: ids(ROSTER_ROWS.RCB) },
  { id:'KKR',  name:'Kolkata Knight Riders',      short_name:'KKR',  league:'IPL', color:'#3A225D', logo_emoji:'🟣', playerIds: ids(ROSTER_ROWS.KKR) },
  { id:'SRH',  name:'Sunrisers Hyderabad',        short_name:'SRH',  league:'IPL', color:'#F26522', logo_emoji:'🟠', playerIds: ids(ROSTER_ROWS.SRH) },
  { id:'DC',   name:'Delhi Capitals',             short_name:'DC',   league:'IPL', color:'#282968', logo_emoji:'🔷', playerIds: ids(ROSTER_ROWS.DC) },
  { id:'PBKS', name:'Punjab Kings',               short_name:'PBKS', league:'IPL', color:'#ED1B24', logo_emoji:'🔺', playerIds: ids(ROSTER_ROWS.PBKS) },
  { id:'RR',   name:'Rajasthan Royals',           short_name:'RR',   league:'IPL', color:'#EA1A85', logo_emoji:'💗', playerIds: ids(ROSTER_ROWS.RR) },
  { id:'GT',   name:'Gujarat Titans',             short_name:'GT',   league:'IPL', color:'#1B2133', logo_emoji:'⚫', playerIds: ids(ROSTER_ROWS.GT) },
  { id:'LSG',  name:'Lucknow Super Giants',       short_name:'LSG',  league:'IPL', color:'#00A5E4', logo_emoji:'🔶', playerIds: ids(ROSTER_ROWS.LSG) },

  { id:'MIW',  name:'Mumbai Indians',             short_name:'MI-W',  league:'WPL', color:'#004BA0', logo_emoji:'🔵', playerIds: ids(ROSTER_ROWS.MIW) },
  { id:'DCW',  name:'Delhi Capitals',             short_name:'DC-W',  league:'WPL', color:'#282968', logo_emoji:'🔷', playerIds: ids(ROSTER_ROWS.DCW) },
  { id:'UPW',  name:'UP Warriorz',                short_name:'UPW',   league:'WPL', color:'#7B2D8E', logo_emoji:'🟣', playerIds: ids(ROSTER_ROWS.UPW) },
  { id:'GGW',  name:'Gujarat Giants',             short_name:'GG-W',  league:'WPL', color:'#943E4E', logo_emoji:'🟤', playerIds: ids(ROSTER_ROWS.GGW) },
  { id:'RCBW', name:'Royal Challengers Bengaluru',short_name:'RCB-W', league:'WPL', color:'#EC1C24', logo_emoji:'🔴', playerIds: ids(ROSTER_ROWS.RCBW) },
]

export const FRANCHISE_BY_ID: Record<string, Franchise> = Object.fromEntries(
  FRANCHISES.map(f => [f.id, f])
)

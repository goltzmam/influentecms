// Old bookmarked action messages must not expose hosting or credential details.
export function readerMessage(value:string){return /supabase|vercel|migrat|service_role|next_public|api[_ -]?key|[_-]token|api[_-]token/i.test(value)?'Não foi possível concluir a operação. Tente novamente em instantes ou fale com a administração.':value.slice(0,1000);}

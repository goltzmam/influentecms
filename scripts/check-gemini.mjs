// Optional deployment verification: never logs credentials or generated content.
import { generateBlueprint } from '../src/lib/ai/gemini.ts';
try {
 const result=await generateBlueprint({brief:'Crie um portal editorial de fitness chamado SaudeFIT, com foco em movimento para iniciantes e hábitos saudáveis. Use identidade verde, páginas Sobre e Contato e categorias Movimento e Bem-estar. Prepare textos atemporais em rascunho.',references:[]});
 console.log(JSON.stringify({check:'Gemini real',status:'PASS',model:result.model,categories:result.plan.categories.length,sections:result.plan.sections.length,pages:result.plan.pages.length,articles:result.plan.articles.length}));
} catch(error) {
 console.error(JSON.stringify({check:'Gemini real',status:'FAIL',code:error.code||'unknown',message:error.code?error.message:'Falha ao validar a geração.'}));process.exitCode=1;
}

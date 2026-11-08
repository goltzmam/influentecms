// Read-only smoke test: no job, portal, email or publication is created.
import { generateClone } from '../src/lib/clone/generate.ts';
try {
 const result = await generateClone({url:'https://influentenews.com.br',refine:false},AbortSignal.timeout(110000));
 if (!result.plan.clone || !result.plan.articles.length || result.plan.sections.length < 3) throw new Error('Reference could not be converted');
 console.log(JSON.stringify({check:'Clone public import',status:'PASS',articles:result.plan.articles.length,pages:result.plan.pages.length,sections:result.plan.sections.length,images:Object.keys(result.plan.clone.covers).length,warnings:result.warnings.length,aiRefinement:'not_invoked',writes:0}));
} catch {console.log(JSON.stringify({check:'Clone public import',status:'FAIL',writes:0}));process.exitCode=1;}

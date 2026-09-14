import path from 'node:path';
let extractor:Promise<any>|undefined;
/** One quantized model per process. Serialize ingestion to keep free-tier memory bounded. */
export async function embed(text:string):Promise<number[]> {
  if(!extractor) extractor=(async()=>{
    const {pipeline,env}=await import('@xenova/transformers');
    env.cacheDir=process.env.HF_HOME || path.join(process.env.VERCEL?'/tmp':'.cache','models');
    env.backends.onnx.wasm.numThreads=1;
    return pipeline('feature-extraction','Xenova/all-MiniLM-L6-v2',{quantized:true});
  })().catch(error=>{extractor=undefined;throw error;});
  const output=await (await extractor)(text,{pooling:'mean',normalize:true});
  return Array.from(output.data as Float32Array);
}

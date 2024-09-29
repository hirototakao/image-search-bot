import { findSourceMap } from "module";
import {MongoClient, ObjectId} from "mongodb";
import { resourceLimits } from "worker_threads";

async function main(){
  const url = "mongodb+srv://HirotoTakao:lJO8CjRvcFQP1X4f@cluster0.hh5ro.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

  const client = new MongoClient(url);

  await client.connect();

  const db = client.db("image_search_bot");

  try {  
    const today = new Date();

    const year = today.getFullYear();

    const month = today.getMonth();

    const date = today.getDate();

    const promise1 = await db.collection("searchImage").find({query: "python pandas"}).toArray();

    console.log(promise1);
  } catch(error) {
    console.error(error);
  } finally {
    client.close();
  }
}

main().catch(console.error);
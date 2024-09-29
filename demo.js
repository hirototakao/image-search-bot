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

async function deleteAllDatabases(client) {
  const databaseLists = await client.db().admin().listDatabases();

  for(let db of databaseLists.databases) {
    if(db.name === "admin" || db.name === "local") {
      continue;
    }
    const database = client.db(db.name);
    await database.dropDatabase();
  };
}

async function removeDuplicatedData(client, query, url) {
  const db = client.db("image_search_bot");

  const collection = db.collection("searchImage");

  const search_result = await collection.find({ $and: [ { query: query }, { url: url }]}).toArray();

  console.log(search_result);

  const promise = await search_result.map(async(value, key) => {
    if(key < search_result.length - 1) {
      await collection.deleteOne({ "_id": value._id});
      console.log("Deleted the data:", value._id);
    }
  });

  return Promise.all(promise);
}
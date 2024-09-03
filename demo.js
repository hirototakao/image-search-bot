import { findSourceMap } from "module";
import {MongoClient, ObjectId} from "mongodb";
import { resourceLimits } from "worker_threads";

async function main(){
  const url = "mongodb+srv://HirotoTakao:lJO8CjRvcFQP1X4f@cluster0.hh5ro.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

  const client = new MongoClient(url);

  await client.connect();

  try { 
    const result = await client.db("image_search_bot").collection("searchImage").find({ query: "メモ帳" }).toArray();

    console.log(result);
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

async function removeDuplicatedData(client) {
  const db = client.db("image_search_bot");

  const collection = db.collection("searchImage");

  const search_result = await collection.find({ $and: [ { query: "web-scraping" }, { url: "https://i.pinimg.com/236x/36/51/c8/3651c848f5c08eecc01fddf166390846.jpg" }]}).toArray();

  const promise = await search_result.map(async(value, key) => {
    console.log(value._id);
    if(key < search_result.length - 1) {
      await collection.deleteOne({ "_id": value._id});
    }
  });

  return Promise.all(promise);
}
import { findSourceMap } from "module";
import {MongoClient, ObjectId} from "mongodb";
import { resourceLimits } from "worker_threads";
import dotenv from "dotenv";

dotenv.config();

async function main(){
  const url = process.env.MONGODB_CONNECTION_STRING;

  const client = new MongoClient(url);

  await client.connect();

  const db = client.db("image_search_bot");

  try {  
    const promise3 = await db.collection("find_resource").find({}).toArray();

    const update3 = promise3.forEach(async(data) => {
      const promise = await db.collection("find_resource").updateOne({_id: data._id}, { $set: { created_At: Number(data.created_At)}});

      Promise.all([promise]);
    });
    Promise.all([promise3]).then(() => Promise.all([update3])).then(() => console.log("Data modificaton completed!"));
  } catch(error) {
    console.error(error);
  } finally {
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
import {
  Block,
  Client,
  initLogger,
  MilestonePayload,
  parsePayload,
  Utils,
} from "@iota/sdk";
import { topics, MAX_BLOCKS } from './constants';
import { blockMapper, getMilestonePayload, generateBlocks } from './helpers';
import { Recorder, Parsed, RecorderBlock } from "./types";
import fs, { read } from 'fs';

require('dotenv').config({ path: '.env' });

let counter = 0;
const TIME_LIMIT = 10000; // 10 seconds in milliseconds

async function writeToFile(dataObject: any, filePath: string): Promise<void> {
  try {
    // Convert the dataObject to a JSON string
    const jsonString = JSON.stringify(dataObject, null, 2);

    // Write the JSON string to the file
    await fs.promises.writeFile(filePath, jsonString);

    console.log('Data has been written to', filePath);
  } catch (error) {
    console.error('Error writing to file:', error);
    throw error; // Rethrow the error for handling at the caller's level
  }
}

const limitReached = () => {
  console.log(counter);
  return counter >= MAX_BLOCKS;
};

async function run() {
  initLogger();
  if (!process.env.NODE_URL) {
      throw new Error('.env NODE_URL is undefined, see .env.example');
  }

  // Connecting to a MQTT broker using raw ip doesn't work with TCP. This is a limitation of rustls.
  const client = new Client({
      // Insert your node URL in the .env.
      nodes: [process.env.NODE_URL],
  });

  // Array of topics to subscribe to
  // Topics can be found here https://studio.asyncapi.com/?url=https://raw.githubusercontent.com/iotaledger/tips/main/tips/TIP-0028/event-api.yml

  // @ts-ignore
  const recorded: Recorder = {
    start: new Date().getTime(),
    protocol: '',
    network: '',
  };
  const startTime = new Date().getTime();
  const recordedBlocks: RecorderBlock[] = [];

  const callback = async function (error: Error, data: string) {
      if (error != null) {
          console.log(error);
          return;
      }

      const parsed: Parsed = JSON.parse(data);

      if (parsed.topic == 'milestone') {
        const milestonePayload = getMilestonePayload(parsed);
      } else if (parsed.topic == 'blocks') {
          const mappedBlock = blockMapper(parsed);

          if (mappedBlock) {
            recordedBlocks.push(mappedBlock);
            const generatedBlocks = generateBlocks(mappedBlock, 200);
            recordedBlocks.push(...generatedBlocks);
            counter++;
          }

          const currentTime = new Date().getTime();

          if (currentTime - startTime >= TIME_LIMIT) {
            recorded.end = currentTime;
            recorded.recordedBlocks = recordedBlocks;
            await client.clearMqttListeners(topics);
            // await writeToFile(recorded, 'recorded.json');
            // minify and record
            await writeToFile(JSON.stringify(recorded, null, 0), 'recordedMinified.json');
            process.exit(0);
          }
      }
  };


  await client.listenMqtt(topics, callback);
}

run();

import {
  Block,
  Client,
  initLogger,
  MilestonePayload,
  parsePayload,
  Utils,
} from "@iota/sdk";
import { plainToInstance } from 'class-transformer';

import { Parsed, RecorderBlock } from "./types";

export const getMilestonePayload = (milestone: any) => {
  const payload = parsePayload(JSON.parse(milestone.payload)) as MilestonePayload;
  const index = payload.index;
  const previousMilestone = payload.previousMilestoneId;

  return payload;
};

export const blockMapper = (parsed: Parsed, currentTime: number): RecorderBlock | null => {
  const block = plainToInstance(Block, JSON.parse(parsed.payload));

  // @ts-expect-error this type doesn't exist in the @iota/sdk
  block.payload.type = 6;

  try {
    const blockId = Utils.blockId(block);

    const recorderBlock: RecorderBlock = {
      id: blockId,
      timestampRec: currentTime,
      block: block,
    };
    return recorderBlock;
  } catch {
    return null;
  }
}

export const generateBlocks = (block: RecorderBlock, numberForGenerate: number) => {
  const newBlocks = [];
  for (let i = 0; i < numberForGenerate; i++) {
    const newBlock = {
      ...block,
      id: block.id + i,
    };
    newBlocks.push(newBlock);
  }
  return newBlocks;
}

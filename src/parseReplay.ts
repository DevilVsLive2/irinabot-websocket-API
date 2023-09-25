import { DataBuffer } from "./DataBuffer";
import fs from "node:fs";

import path from "node:path"

import {constants} from "node:zlib";
import { inflateSync } from "zlib";

export enum RecordIDs {
    AdditionalPlayerRecord = 0x16,
    GameStartRecord = 0x19,
}

export type ReplaySubHeader = {
    unknownNumber?: number
    isClassic?: boolean,
    versionNumber: number,
    buildNumber: number,
    singlePlayer: boolean,
    replayLength: number,
    CRCchecksum: number,
}

export type ReplayHeaders = {
    fileHeader: string,
    fileOffset: 0x44 | 0x40,
    compressedSize: number,
    headerVersion: number,
    decompressedSize: number,
    compressedBlockNumber: number,
    subHeader: ReplaySubHeader,
}

export enum PlayerRaces {
    Human,
    Orc,
    Nightelf,
    Undead,
    Daemon,
    Random,
    SelectableOrFixed
}

export interface PlayerRecord {
    host: boolean;
    slot: number;
    name: string;
    actions: Actions[];
    apm: number;
    apmAtMinute(minute:number):number;
    race?: PlayerRaces;
}

export enum GameSpeedSetting {
    Slow,
    Normal,
    Fast,
    Unused,
}

export enum VisibilitySetting {
    Hide,
    Explored,
    Visible,
    Default,
}

export enum ObserversSetting {
    Off,
    Unused,
    OnDefeat,
    On,
    Referees,
}

export enum FixedTeamsSetting {
    Off,
    Unused,
    On,
}

export enum GameType {
    Unknown,
    Ladder,
    Custom,
    Single,
    LadderTeam
}

export type GameSettings = {
    gameSpeed: GameSpeedSetting,
    visibility: VisibilitySetting,
    observers: ObserversSetting,
    teamsTogether: boolean,
    fixedTeams: FixedTeamsSetting,
    fullSharedUnitControl: boolean,
    randomHero: boolean,
    randomRaces: boolean,
    mapChecksum: number,
    mapPath: string,
    creatorName: string,
    playerCount: number,
    gameType: GameType,
    private: boolean,
    languageId: number
}

export enum SlotStatus {
    Empty,
    Closed,
    Used,
}

export enum AIStrength {
    Easy,
    Normal,
    Insane,
}

export type SlotRecord = {
    slotStatus: SlotStatus,
    isHuman: boolean,
    teamNumber: number,
    color: number,
    race: PlayerRaces,
    handicap: number,
    AIstrength?: AIStrength,
}

export enum SelectMode {
    TeamAndRaceSelectable = 0x00,
    TeamNotSelectable = 0x01,
    TeamAndRaceNotSelectable = 0x03,
    RaceFixedToRandom = 0x04,
    AutomatedMatchMaking = 0xcc,
}

export type GameStartRecord = {
    slotRecordsNumber: number,
    slotRecord: { playerId: number, record: SlotRecord }[],
    randomSeed: number,
    selectMode: SelectMode,
    startSpotCount: number,
}
export enum LeaveReasons {
    ConnectionClosedByRemoteGame,
    ConnectionClosedByLocalGame,
    Unknown,
}

//TODO: какого черта там нахуй написано, надо будет разобраться
export enum LeaveTypes {
    disconnected,
    left,
    lost,
    won,
    draw,
    leftAsObserver,
    replaySaverDisconnected,

}

export interface LeaveBlock {
    id: 0x17,
    reason: LeaveReasons,
    playerId: number,
    leaveType: LeaveTypes,
    unknown: number,
}

export interface TimeSlotBlock {
    id: 0x1E | 0x1F,
    length: number, 
    timeIncrement: number,
    commandData: {playerId: number, actionBlockLength: number, action: Actions[]},
}

export enum ChatMode {
    toAll,
    toAllies,
    toObservers,
}

export interface PlayerChatMessageBlock {
    playerId: number,
    chatMode: ChatMode | {toPlayer: number},
    message: string,
}

export interface ForcedGameEndBlock {
    id: 0x2F,
    mode: 0x00 | 0x01,
    countdown: number,
}

type Block = TimeSlotBlock | PlayerChatMessageBlock | ForcedGameEndBlock | LeaveBlock;

export enum ActionIds {
    PauseGame = 0x01,
    ResumeGame = 0x02,
    SetGameSpeed = 0x03,
    IncreaseGameSpeed = 0x04,
    DecreaseGameSpeed = 0x05,
    SaveGame = 0x06,
    SaveGameFinished = 0x07,
    UnitCastAbility = 0x10,
    UnitCastTargetPositionAbility = 0x11,
    UnitCastTargetAbility = 0x12,
    DropItem = 0x13,
    GiveItem = ActionIds.DropItem,
    UnitCastTargetPositionAbilityDoubled = 0x14,
    ChangeSelection = 0x16,
    AssignGroup = 0x17,
    SelectGroup = 0x18,
    SelectSubgroup = 0x19,
    PreSubselection = 0x1A,
    unknownFlag = 0x1B,
    unknownFlagPre114b = 0x1A,
    SelectGroundItem = 0x1C,
    SelectGroundItemPre114b = 0x1B,
    CancelHeroRevival = 0x1D,
    CancelHeroRevivalPre114b = 0x1C,
    RemoveUnitFromBuldingQueue = 0x1E,
    RemoveUnitFromBuldingQueuePre114b = 0x1D,
    unknownFlag2 = 0x21,
    CheatTheDudeAbides = 0x20,
    CheatSomebodySetUpUsTheBomb = 0x22,
    CheatWarpTen = 0x23,
    CheatIocainePowder = 0x24,
    CheatPointBreak = 0x25,
    CheatWhosYourDaddy = 0x26,
    CheatKeyserSoze = 0x27,
    CheatLeafitToMe = 0x28,
    CheatThereIsNoSpoon = 0x29,
    CheatStrengthAndHonor = 0x2A,
    Cheatitvexesme = 0x2B,
    CheatWhoIsJohnGalt = 0x2C,
    CheatGreedIsGood = 0x2D,
    CheatDayLightSavings = 0x2E,
    CheatISeeDeadPeople = 0x2F,
    CheatSynergy = 0x30,
    CheatSharpAndShiny = 0x31,
    CheatAllYourBaseAreBelongToUs = 0x32,
    ChangeAlly = 0x50,
    TransferResources = 0x51,
    unknownFlag3 = 0x60,
    EscPress = 0x61,
    ScenarioTrigger = 0x62,
    EnterChoosHeroSkill = 0x66,
    EnterChoosHeroSkillPre106 = 0x65,
    EnterChooseBuildings = 0x67,
    EnterChooseBuildingsPre106 = 0x66,
    MinimapSignal = 0x68,
    MinimapSignalPre106 = 0x67,
    unknownFlag4 = 0x75,
}

type Action<ActionId, ActionData> = {
    actionId: ActionId,
    rawData: DataBuffer,
    data: ActionData,
}

export type ActionPauseGame = Action<ActionIds.PauseGame, {}>
export type ActionResumeGame = Action<ActionIds.ResumeGame, {}>
export type ActionSetGameSpeed = Action<ActionIds.SetGameSpeed, {gameSpeed: GameSpeedSetting}>
export type ActionIncreaseGameSpeed = Action<ActionIds.IncreaseGameSpeed, {}>
export type ActionDecreaseGameSpeed = Action<ActionIds.DecreaseGameSpeed, {}>
export type ActionSaveGame = Action<ActionIds.SaveGame, {savegameName: string}>
export type ActionSaveGameFinished = Action<ActionIds.SaveGameFinished, {unknownFlag: number}>
//TODO: разобраться с abilityFlag и itemID
export type ActionUnitCastAbility = Action<ActionIds.UnitCastAbility, {abilityFlag: any, itemID: any, unknownA?: number, unknownB?: number}>
export type ActionUnitCastTargetPositionAbility = Action<ActionIds.UnitCastTargetPositionAbility, {abilityFlag: any, itemID: any, targetLocationX: number, targetLocationY: number, unknownA?: number, unknownB?: number}>
export type ActionUnitCastTargetAbility = Action<ActionIds.UnitCastTargetAbility, {abilityFlag: any, itemID: any, targetPositionX: number, targetPositionY: number, objectID1: number, objectID2: number, unknownA?: number, unknownB?: number}>
export type ActionGiveItemToUnit = Action<ActionIds.GiveItem, {abilityFlag: any, itemID: any, targetLocationX: number, targetLocationY: number, targetObjectId1: number, targetObjectId2: number, itemObjectId1: number, itemObjectId2: number}>
export type ActionDropItem = Action<ActionIds.DropItem, {abilityFlag: any, itemID: any, targetLocationX: number, targetLocationY: number, itemObjectId1: number, itemObjectId2: number}>


export type Actions = ActionPauseGame | ActionResumeGame

export type BlocksData = {
    players: PlayerRecord[],
    gameName: string,
    gameSettings: GameSettings,
    gameStartRecord: GameStartRecord,
    blocks: Block[],
}

export type ReplayData = {
    headers: ReplayHeaders,
    gameName: string,
    players: PlayerRecord[],
    gameSettings: GameSettings,
    gameStartRecord: GameStartRecord,
}

function isKthBitSet(number: number, bitIndex: number) {
    return (number & (1 << bitIndex)) > 0;
}

export class ReplayParser {

    private _replayPath?: string;
    public get replayPath(): string {
        return this._replayPath || "";
    }
    public set replayPath(value: string) {
        this.replayPath = value;
        const dataBuffer = fs.readFileSync(value);
        this.replayDataBuffer = new DataBuffer(dataBuffer);
    }
    private _replayDataBuffer: DataBuffer;
    public get replayDataBuffer(): DataBuffer {
        return this._replayDataBuffer;
    }
    public set replayDataBuffer(value: DataBuffer) {
        this._replayDataBuffer = value;
        this.parse();
    }
    private _replayUrl?: string;
    public get replayUrl(): string {
        return this._replayUrl || "";
    }
    public set replayUrl(value: string) {
        this._replayUrl = value;
        fetch(value).then( (response) => {
            if (!response.ok) return;
            response.arrayBuffer().then(arrayBuffer => {
                this.replayDataBuffer = new DataBuffer(arrayBuffer);
            });
        });

    }

    private _replayHeader: ReplayHeaders;
    public get replayHeader(): ReplayHeaders {
        return this._replayHeader;
    }
    private _replaySubHeader: ReplaySubHeader;
    public get replaySubHeader(): ReplaySubHeader {
        return this._replaySubHeader;
    }
    private _replayGameSettings: GameSettings;
    public get replayGameSettings(): GameSettings {
        return this._replayGameSettings;
    }
    private _replayGameStartRecord: GameStartRecord;
    public get replayGameStartRecord(): GameStartRecord {
        return this._replayGameStartRecord;
    }
    private _replayPlayersData: PlayerRecord[];
    public get replayPlayersData(): PlayerRecord[] {
        return this._replayPlayersData;
    }



    private parseSubHeader(dataBuffer: DataBuffer, headerVersion: number) : {success: true, subHeader: ReplaySubHeader} | {success: false, reason: string} {
        const subHeader:ReplaySubHeader = undefined;
        if (headerVersion == 0x00) {
            subHeader.unknownNumber = dataBuffer.getUint16();
            subHeader.versionNumber = dataBuffer.getUint16();
            subHeader.buildNumber = dataBuffer.getUint16();
            const singlePlayerFlag = dataBuffer.getUint16();
            if (singlePlayerFlag != 0x8000 && singlePlayerFlag != 0x0000) {
                return {success: false, reason: `Expected single player flag value 0x8000 or 0x0000, but got ${singlePlayerFlag}`}
            }
            subHeader.singlePlayer = singlePlayerFlag != 0x8000;
            subHeader.replayLength = dataBuffer.getUint32();
            subHeader.CRCchecksum = dataBuffer.getUint32();
        } else {
            const subHeader:ReplaySubHeader = {
                versionNumber: undefined,
                buildNumber: undefined,
                singlePlayer: undefined,
                replayLength: undefined,
                CRCchecksum: undefined,
                isClassic: undefined
            }
            const charCodes = dataBuffer.getArray(4);
            let versionIdentifier = "";
            for (const charCode of charCodes) {
                versionIdentifier += String.fromCharCode(charCode);
            }
            
            if (versionIdentifier != "3RAW" && versionIdentifier != "PX3W") {
                return {success: false, reason: `expected version identifier "3RAW" or "PX3W" but got ${versionIdentifier}`}
            }
            subHeader.isClassic = versionIdentifier == "3RAW";
            subHeader.versionNumber = dataBuffer.getUint32();
            subHeader.buildNumber = dataBuffer.getUint16();
            const singlePlayerFlag = dataBuffer.getUint16();
            if (singlePlayerFlag != 0x8000 && singlePlayerFlag != 0x0000) {
                return {success: false, reason: `Expected single player flag value 0x8000 or 0x0000, but got ${singlePlayerFlag}`}
            }
            subHeader.singlePlayer = singlePlayerFlag == 0x0000;
            subHeader.replayLength = dataBuffer.getUint32();
            subHeader.CRCchecksum = dataBuffer.getUint32();
            return {success: true, subHeader: subHeader}
        }
        return {success: true, subHeader: subHeader};
    }

    private parseHeaders() : {success: true, headers: ReplayHeaders} | {success: false, reason: string} {
        const headers:ReplayHeaders = {
            fileHeader: undefined,
            fileOffset: undefined,
            compressedSize: 0,
            headerVersion: 0,
            decompressedSize: 0,
            compressedBlockNumber: 0,
            subHeader: undefined
        }
        headers.fileHeader = this.replayDataBuffer.getNullTerminatedString();
        if (!headers.fileHeader.startsWith("Warcraft III recorded game")) {
            return {success: false, reason: `Expected File Header "Warcraft III recorded game", got ${headers.fileHeader} `}
        } 
        const headerOffset = this.replayDataBuffer.getUint32();
        if (headerOffset != 0x44 && headerOffset != 0x40) {
            return {success: false, reason: `Expected header offset 0x44 or 0x40, but got ${headerOffset}`};
        }
        headers.fileOffset = headerOffset
        headers.compressedSize = this.replayDataBuffer.getUint32();
        const headerVersion = this.replayDataBuffer.getUint32();
        if (headerVersion != 0x00 && headerVersion != 0x01) {
            return {success: false, reason: `Expected header version 0x01 or 0x00, but got ${headerVersion}`}
        }
        headers.headerVersion = headerVersion;
        headers.decompressedSize = this.replayDataBuffer.getUint32();
        headers.compressedBlockNumber = this.replayDataBuffer.getUint32();
        const parsedSubHeader = this.parseSubHeader(this.replayDataBuffer, headers.headerVersion);
        if (parsedSubHeader.success == true) {
            headers.subHeader = parsedSubHeader.subHeader;
        } else {
            return {success: false, reason: parsedSubHeader.reason};
        }
        return {success: true, headers: headers};
    }

    private isHostSet: boolean;

    private parsePlayerRecord(dataBuffer: DataBuffer) : {success: true, playerRecord: PlayerRecord} | {success: false, reason: string} {
        let response:PlayerRecord = {
            host: undefined,
            slot: undefined,
            name: undefined,
            apm: undefined,
            apmAtMinute:undefined,
            actions: undefined,
        };
        if (!this.isHostSet) {
            const isHostFlag = dataBuffer.getUint8();
            if (isHostFlag != 0x00 && isHostFlag != 0x16) {
                return {success: false, reason: `For first player record, isHostFlag should be equal to 0x00 or 0x16, but got ${isHostFlag}`}
            }
            response.host = isHostFlag == 0x00;
        } else {
            response.host = false;
        }
        response.slot = dataBuffer.getUint8();
        response.name = dataBuffer.getNullTerminatedString();
        const additionalDataSize = dataBuffer.getUint8();
        if (additionalDataSize != 0x01 && additionalDataSize != 0x08) {
            return {success: false, reason: `Expected size of additional player record is 0x01 or 0x08, but got ${additionalDataSize}`}
        }
        if (additionalDataSize == 0x08) {
            const playerRaceIndex = dataBuffer.getUint8();
            if (playerRaceIndex != 0x01 && playerRaceIndex != 0x02 && playerRaceIndex != 0x04 &&
                playerRaceIndex != 0x08 && playerRaceIndex != 0x10 && playerRaceIndex != 0x20 &&
                playerRaceIndex != 0x40) {
                    return {success: false, reason: `Got unexpected race index (${playerRaceIndex})`}
                }
            response.race = ( 
                playerRaceIndex == 0x01 ? PlayerRaces.Human : 
                playerRaceIndex == 0x02 ? PlayerRaces.Orc : 
                playerRaceIndex == 0x04 ? PlayerRaces.Nightelf : 
                playerRaceIndex == 0x08 ? PlayerRaces.Undead : 
                playerRaceIndex == 0x10 ? PlayerRaces.Daemon : 
                playerRaceIndex == 0x20 ? PlayerRaces.Random : PlayerRaces.SelectableOrFixed)
        } else {
            // null byte
            const nullByte = dataBuffer.getUint8();
        }
        return {success: true, playerRecord: response};
    }
    
    /**
     * 
     * @returns the databuffer that got, with replaced encoded part to decoded.
     */
    private decodeEncodedString (dataBuffer: DataBuffer) : DataBuffer {
        const beforeEncodedString = new DataBuffer(dataBuffer.toArrayBuffer().slice(0, dataBuffer.position));
        const beforeEncodedStringPosition = dataBuffer.position;
        const response = new DataBuffer(new ArrayBuffer(0));

        let currentCharNum:number = dataBuffer.getUint8();
        let decodedChars:number[] = [];
        let pos = 0;
        let mask;
        while (currentCharNum != 0) {
            if (pos%8 == 0) {
                mask = currentCharNum;
            }
            else
            {
                if (!isKthBitSet(mask, pos%8))
                    decodedChars.push(currentCharNum - 1);
                else
                    decodedChars.push(currentCharNum);
            }
            
            currentCharNum = dataBuffer.getUint8();
            pos++;
        }
        response.putByteArray(new Uint8Array(beforeEncodedString.toArrayBuffer()));
        response.putByteArray(decodedChars);
        response.putUint8(currentCharNum); //NULL
        const afterEncodedString = new DataBuffer(dataBuffer.toArrayBuffer().slice(dataBuffer.position));
        response.putByteArray(new Uint8Array(afterEncodedString.toArrayBuffer()));

        response.position = beforeEncodedStringPosition;



        return response;
    }

    private parseGameSettings (decodedGameSettings: DataBuffer) : {success: true, gameSettings: GameSettings} | {success: false, reason: string} {
        const response:GameSettings = {
            gameSpeed: undefined,
            visibility: undefined,
            observers: undefined,
            teamsTogether: undefined,
            fixedTeams: undefined,
            fullSharedUnitControl: undefined,
            randomHero: undefined,
            randomRaces: undefined,
            mapChecksum: undefined,
            mapPath: undefined,
            creatorName: undefined,
            playerCount: undefined,
            gameType: undefined,
            private: undefined,
            languageId: undefined,
        }

        let flag = decodedGameSettings.getUint8();
        if (flag != GameSpeedSetting.Fast && flag != GameSpeedSetting.Normal && flag != GameSpeedSetting.Slow && flag != GameSpeedSetting.Unused) {
            return {success: false, reason: `Got unexpected gameSpeed (${flag})`}
        }
        response.gameSpeed = flag;
        flag = decodedGameSettings.getUint8();
        if (!isKthBitSet(flag, 3) && !isKthBitSet(flag, 2) && !isKthBitSet(flag, 1) && !isKthBitSet(flag, 0)) {
            return {success: false, reason: `Visibility flag is unset! (equal to 0, but expected to be equal at least 1)`}
        }
        response.visibility = isKthBitSet(flag, 3) ? VisibilitySetting.Default : isKthBitSet(flag, 2) ? VisibilitySetting.Visible : isKthBitSet(flag, 1) ? VisibilitySetting.Explored : VisibilitySetting.Hide;
        response.observers = (isKthBitSet(flag, 5) && isKthBitSet(flag, 4)) ? ObserversSetting.On : isKthBitSet(flag, 5) ? ObserversSetting.OnDefeat : isKthBitSet(flag, 4) ? ObserversSetting.Unused : ObserversSetting.Off;
        response.teamsTogether = isKthBitSet(flag, 6);
        flag = decodedGameSettings.getUint8();
        response.fixedTeams = (isKthBitSet(flag, 2) && isKthBitSet(flag, 1)) ? FixedTeamsSetting.On : isKthBitSet(flag, 2) ? FixedTeamsSetting.Unused : isKthBitSet(flag, 1) ? FixedTeamsSetting.Unused : FixedTeamsSetting.Off;
        flag = decodedGameSettings.getUint8();
        response.fullSharedUnitControl = isKthBitSet(flag, 0);
        response.randomHero = isKthBitSet(flag, 1);
        response.randomRaces = isKthBitSet(flag, 2);
        if ((response.observers == ObserversSetting.On || response.observers == ObserversSetting.Off) && isKthBitSet(flag, 6)) response.observers = ObserversSetting.Referees;
        //unused bytes
        decodedGameSettings.getArray(5);
        
        response.mapChecksum = decodedGameSettings.getUint32();
        response.mapPath = decodedGameSettings.getNullTerminatedString();
        response.creatorName = decodedGameSettings.getNullTerminatedString();
        // nullbyte
        decodedGameSettings.getUint8();
        //empty null-terminated string
        decodedGameSettings.getNullTerminatedString();

        response.playerCount = decodedGameSettings.getUint32();
        //as I understood, it's works only for patch <1.07, do not use those values for replays that are have patch >= 1.07
        flag = decodedGameSettings.getUint8();
        response.gameType = flag == 0x00 ? GameType.Unknown : flag == 0x01 ? GameType.Ladder : flag == 0x09 ? GameType.Custom : flag == 0x1D ? GameType.Single : flag == 0x20 ? GameType.LadderTeam : undefined;
        flag = decodedGameSettings.getUint8();
        response.private = flag == 0x00 ? false : flag == 0x08 ? true : undefined;
        //null bytes (<1.07 patch only, >=1.07 - unknown bytes.)
        decodedGameSettings.getUint16();
        //not sure, don't recommend to use this too.
        response.languageId = decodedGameSettings.getUint32();


        return {success: true, gameSettings: response};
    }

    private parseGameStartRecord(dataBuffer: DataBuffer) : {success: true, gameStartRecord: GameStartRecord} | {success: false, reason: string} {
        const response:GameStartRecord = {
            slotRecordsNumber: undefined,
            slotRecord: [],
            randomSeed: undefined,
            selectMode: undefined,
            startSpotCount: undefined,
        }

        response.slotRecordsNumber = dataBuffer.getUint8();

        for (let i = 0; i < response.slotRecordsNumber; i++) {
            const record:SlotRecord = {
                slotStatus: undefined,
                isHuman: undefined,
                teamNumber: undefined,
                color: undefined,
                race: undefined,
                handicap: undefined,
            }
            const playerId = dataBuffer.getUint8();
            const downloadPercent = dataBuffer.getUint8();
            if (downloadPercent != 100 && downloadPercent != 255) {
                return {success: false, reason: `Slot record ${i}, expected download percent value is 100 or 255, but got ${downloadPercent}`}
            }
            const slotStatus = dataBuffer.getUint8();
            if (slotStatus != SlotStatus.Closed && slotStatus != SlotStatus.Empty && slotStatus != SlotStatus.Used) return {success: false, reason: `Got unexpected slot status ${slotStatus} for SlotRecord ${i}`}
            record.slotStatus = slotStatus;
            const isHumanFlag = dataBuffer.getUint8();
            if (isHumanFlag != 0x00 && isHumanFlag != 0x01) return {success: false, reason: `Got unexpected isHumanFlag (${isHumanFlag}) for SlotRecord ${i}`}
            record.isHuman = isHumanFlag == 0x00;
            record.teamNumber = dataBuffer.getUint8();
            record.color = dataBuffer.getUint8();
            let flag = dataBuffer.getUint8();
            if (flag != 0x01 && flag != 0x02 && flag != 0x04 && flag != 0x08 && flag != 0x20 && flag != 0x40) return {success: false, reason: `Got unexpected race (${flag}) for SlotStatus ${i}` }
            record.race = flag == 0x01 ? PlayerRaces.Human : flag == 0x02 ? PlayerRaces.Orc : flag == 0x04 ? PlayerRaces.Nightelf : flag == 0x08 ? PlayerRaces.Undead : flag == 0x20 ? PlayerRaces.Random : PlayerRaces.SelectableOrFixed;
            flag = dataBuffer.getUint8();
            if (!record.isHuman) record.AIstrength = flag;
            record.handicap = dataBuffer.getUint8();
            response.slotRecord.push({
                playerId: playerId,
                record: record,
            });
        }
        response.randomSeed = dataBuffer.getUint32();
        let flag = dataBuffer.getUint8();
        if (flag != SelectMode.AutomatedMatchMaking && flag != SelectMode.RaceFixedToRandom && flag != SelectMode.TeamAndRaceNotSelectable && flag != SelectMode.TeamAndRaceSelectable && flag != SelectMode.TeamNotSelectable) return {success: false, reason: `Unexpected SelectMode(${flag})`}
        response.selectMode = flag;
        response.startSpotCount = dataBuffer.getUint8();


        return {success: true, gameStartRecord: response};
    }

    private async decompressBlocks() : Promise<{success: true, decompressedBlocks: BlocksData} | {success: false, reason: string}> {
        const response:BlocksData = {
            players: [],
            gameName: undefined,
            gameSettings: undefined,
            gameStartRecord: undefined,
            blocks: [],
        }

        let decompressedData = new DataBuffer(new ArrayBuffer(0));
        for (let index = 0; index < this.replayHeader.compressedBlockNumber; index++) {
            const compressedBlockSize = this.replayDataBuffer.getUint16();
            const decompressedBlockSize = this.replayDataBuffer.getUint16();
            if (decompressedBlockSize != 8192) {
                return {success: false, reason: `Expected decompressed block size is 8192, but got ${decompressedBlockSize}`};
            }
            const checksum = this.replayDataBuffer.getUint32();
            const decompressData = this.replayDataBuffer.getArray(compressedBlockSize);
            let a = inflateSync(new Uint8Array(decompressData), { flush: constants.Z_SYNC_FLUSH });
            decompressedData.putByteArray(a);
        }
        decompressedData.position = 0;

        //unknow, always set to 0x00000110
        const unknown = decompressedData.getUint32();
        if (unknown != 0x00000110) return {success: false, reason: `unknown number at the start of first block must be equal 0x00000110, but got ${unknown}`}
        const firstPlayerRecord = this.parsePlayerRecord(decompressedData);
        if (firstPlayerRecord.success == false) return {success: false, reason: firstPlayerRecord.reason};
        response.players.push(firstPlayerRecord.playerRecord);
        this.isHostSet = true;
        response.gameName = decompressedData.getNullTerminatedString();
        if (decompressedData.getUint8() != 0) decompressedData.position--;
        decompressedData = this.decodeEncodedString(decompressedData);

        const gameSettings = this.parseGameSettings(decompressedData);
        if (gameSettings.success == false) return {success: false, reason: gameSettings.reason}

        response.gameSettings = gameSettings.gameSettings;
        
        let flag = decompressedData.getUint8();

        while (flag == RecordIDs.AdditionalPlayerRecord) {
            const playerRecord = this.parsePlayerRecord(decompressedData);
            if (playerRecord.success == false) {
                return {success: false, reason: playerRecord.reason};
            }
            response.players.push(playerRecord.playerRecord);
            //unknown bytes
            decompressedData.getUint32();


            flag = decompressedData.getUint8();
        }
        if (flag != RecordIDs.GameStartRecord) return {success: false, reason: `After AdditionalPlayerRecord expected GameStartRecord (0x19) but got ${flag}`};
        //number of data bytes following
        decompressedData.getUint16();

        const gameStartRecord = this.parseGameStartRecord(decompressedData);
        if (gameStartRecord.success == false) return {success: false, reason: gameStartRecord.reason}
        response.gameStartRecord = gameStartRecord.gameStartRecord;

        /**
         * Now parsing here all replay data. All data is separated
         * on blocks, that have id from what block starts
         * and other data.
         */


        


        return {success: true, decompressedBlocks: response};
    }

    private async parse() : Promise<{success: true} | {success: false, reason: string}> {
        const headers = this.parseHeaders();
        if (headers.success == false) {
            return {success: false, reason: headers.reason}
        }
        this._replayHeader = headers.headers;
        const decompressedData = await this.decompressBlocks();
        if (decompressedData.success == false) {
            return {success: false, reason: decompressedData.reason};
        }
        this._replayGameSettings = decompressedData.decompressedBlocks.gameSettings;
        this._replayGameStartRecord = decompressedData.decompressedBlocks.gameStartRecord;
        const response = {
            headers: headers.headers,
            gameName: decompressedData.decompressedBlocks.gameName,
            players: decompressedData.decompressedBlocks.players,
            gameSettings: decompressedData.decompressedBlocks.gameSettings,
            gameStartRecord: decompressedData.decompressedBlocks.gameStartRecord,
        };

        return {success: true}
    }

    public parseFromUrl(url: string) : Promise<{success: true} | {success: false, reason: string}> {
        return new Promise<{success: true} | {success: false, reason: string}>(async (resolve, reject) => {
            this._replayUrl = url;
            const request = await fetch(url);;
            if (!request.ok) return {success: false, reason: await request.text()}
            const response = await request.arrayBuffer();
            this._replayDataBuffer = new DataBuffer(response);
            resolve(await this.parse());
        });
    }
    public async parseFromFile(filePath: string) : Promise<{success: true} | {success: false, reason: string}> {
        const dataBuffer = fs.readFileSync(filePath);
        this._replayPath = path.resolve(filePath);
        this._replayDataBuffer = new DataBuffer(dataBuffer.buffer);
        return await this.parse();
    }
    
}
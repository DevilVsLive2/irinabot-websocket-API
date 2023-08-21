"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataBuffer = void 0;
class DataBuffer {
    offset;
    littleEndian;
    data;
    allowResize;
    constructor(arrayBuffer) {
        this.data = new DataView(arrayBuffer);
        this.offset = 0;
        this.littleEndian = true;
        this.allowResize = true;
    }
    reserveIfNeed(count) {
        if (!this.allowResize)
            return;
        if (this.offset + count <= this.data.buffer.byteLength)
            return;
        const newBuffer = new ArrayBuffer(this.offset + count);
        new Uint8Array(newBuffer).set(new Uint8Array(this.data.buffer));
        this.data = new DataView(newBuffer);
        return this;
    }
    get length() {
        return this.data.byteLength;
    }
    set position(position) {
        this.offset = position;
    }
    get position() {
        return this.offset;
    }
    toArrayBuffer() {
        return this.data.buffer;
    }
    getUint8() {
        const resp = this.data.getUint8(this.offset);
        this.offset++;
        return resp;
    }
    putUint8(number) {
        this.reserveIfNeed(1);
        this.data.setUint8(this.offset, number);
        this.offset++;
        return this;
    }
    getInt8() {
        const resp = this.data.getInt8(this.offset);
        this.offset++;
        return resp;
    }
    putInt8(number) {
        this.reserveIfNeed(1);
        this.data.setInt8(this.offset, number);
        this.offset++;
        return this;
    }
    getInt16() {
        const resp = this.data.getInt16(this.offset, this.littleEndian);
        this.offset += 2;
        return resp;
    }
    putInt16(number) {
        this.reserveIfNeed(2);
        this.data.setInt16(this.offset, number, this.littleEndian);
        this.offset += 2;
        return this;
    }
    getUint16() {
        let resp = this.data.getUint16(this.offset, this.littleEndian);
        this.offset += 2;
        return resp;
    }
    putUint16(number) {
        this.reserveIfNeed(2);
        this.data.setUint16(this.offset, number, this.littleEndian);
        this.offset += 2;
        return this;
    }
    getInt32() {
        let resp = this.data.getInt32(this.offset, this.littleEndian);
        this.offset += 4;
        return resp;
    }
    putInt32(number) {
        this.reserveIfNeed(4);
        this.data.setInt32(this.offset, number, this.littleEndian);
        this.offset += 4;
        return this;
    }
    getUint32() {
        let resp = this.data.getUint32(this.offset, this.littleEndian);
        this.offset += 4;
        return resp;
    }
    putUint32(number) {
        this.reserveIfNeed(4);
        this.data.setUint32(this.offset, number, this.littleEndian);
        this.offset += 4;
        return this;
    }
    getNullTerminatedString() {
        let ints = [];
        for (let i = 0; true; ++i) {
            let newbyte = this.getUint8();
            if (newbyte === 0) {
                let S = DataBuffer.stringFromUTF8Array(ints);
                if (S === null)
                    return "";
                return S;
            }
            ints[ints.length] = newbyte;
        }
    }
    putNullTerminatedString(str) {
        const dataString = DataBuffer.toUTF8Array(str);
        this.reserveIfNeed(dataString.length + 1);
        this.putByteArray(dataString);
        this.putUint8(0);
        return this;
    }
    getArray(size) {
        let ints = [];
        for (let i = 0; i < size; ++i) {
            ints[ints.length] = this.getUint8();
        }
        return ints;
    }
    putByteArray(array) {
        this.reserveIfNeed(array.length);
        array.forEach((i) => {
            this.putUint8(i);
        }, this);
        return this;
    }
    static stringFromUTF8Array(data) {
        const extraByteMap = [1, 1, 1, 1, 2, 2, 3, 0];
        let count = data.length;
        let str = "";
        for (let index = 0; index < count;) {
            let ch = data[index++];
            if (ch & 0x80) {
                let extra = extraByteMap[(ch >> 3) & 0x07];
                if (!(ch & 0x40) || !extra || index + extra > count)
                    return null;
                ch = ch & (0x3f >> extra);
                for (; extra > 0; extra -= 1) {
                    let chx = data[index++];
                    if ((chx & 0xc0) !== 0x80)
                        return null;
                    ch = (ch << 6) | (chx & 0x3f);
                }
            }
            str += String.fromCharCode(ch);
        }
        return str;
    }
    static toUTF8Array(str) {
        var utf8 = [];
        for (var i = 0; i < str.length; i++) {
            var charcode = str.charCodeAt(i);
            if (charcode < 0x80)
                utf8.push(charcode);
            else if (charcode < 0x800) {
                utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
            }
            else if (charcode < 0xd800 || charcode >= 0xe000) {
                utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
            }
            else {
                i++;
                charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
                utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
            }
        }
        return utf8;
    }
}
exports.DataBuffer = DataBuffer;
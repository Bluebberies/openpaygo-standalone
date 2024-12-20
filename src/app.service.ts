import { Injectable } from '@nestjs/common';
import { Decoder, Encoder, TokenTypes } from 'openpaygo';
import * as fs from 'fs';
import * as csvParser from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import { listenerCount } from 'process';

const decoder = new Decoder();
const encoder = new Encoder();

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getTokens() {
    // { value, tokenType, count, updatedCounts } =
    // return decoder.decodeToken({
    //   token: '716147506',
    //   secretKeyHex: 'e42fe95bcdc443718701e0e67ff1ddad',
    //   count: 2,
    //   usedCounts: [],
    //   startingCode: 674975504,
    //   restrictedDigitSet: false,
    // });

    const newData = [];

    // const data = [
    //   {
    //     secretKeyHex: 'e42fe95bcdc443718701e0e67ff1ddad',
    //     count: 1,
    //     valueDivider: 1,
    //     restrictDigitSet: false,
    //     startingCode: 674975504,
    //   },
    //   {
    //     secretKeyHex: '9bb26bc36d7c1ac09eeba30ed9fa47a8',
    //     count: 1,
    //     valueDivider: 1,
    //     restrictDigitSet: false,
    //     startingCode: 705806064,
    //   },
    //   {
    //     secretKeyHex: 'eb436ec88b69c91b192674830d830605',
    //     count: 1,
    //     valueDivider: 1,
    //     restrictDigitSet: false,
    //     startingCode: 596689510,
    //   },
    // ];

    const data = {
      secretKeyHex: 'e42fe95bcdc443718701e0e67ff1ddad',
      count: 1,
      valueDivider: 1,
      restrictDigitSet: false,
      startingCode: 674975504,
    };

    const tokenTypes = [1, 2, 7, 'forever'];

    let count = 2;

    for (let j = 0; j < tokenTypes.length; j++) {
      console.log({ count });
      const encodedVal = encoder.generateToken({
        secretKeyHex: data['secretKeyHex'],
        count: count,
        value:
          tokenTypes[j] != 'forever' ? (tokenTypes[j] as number) : undefined,
        valueDivider: 1,

        restrictDigitSet: false,
        tokenType:
          tokenTypes[j] == 'forever'
            ? TokenTypes.DISABLE_PAYG
            : TokenTypes.ADD_TIME,
        startingCode: data['startingCode'],
      });

      count = encodedVal.newCount

      newData.push({ ...encodedVal, days: tokenTypes[j] });
    }

    // for (let i = 0; i < data.length; i++) {
    //   const tokenVals = [];
    //   for (let j = 0; j < tokenTypes.length; j++) {
    //     const encodedVal = encoder.generateToken({
    //       secretKeyHex: data[i]['secretKeyHex'],
    //       count: 1,
    //       value:
    //         tokenTypes[j] != 'forever' ? (tokenTypes[j] as number) : undefined,
    //       valueDivider: 1,

    //       restrictDigitSet: false,
    //       tokenType:
    //         tokenTypes[j] == 'forever'
    //           ? TokenTypes.DISABLE_PAYG
    //           : TokenTypes.SET_TIME,
    //       startingCode: data[i]['startingCode'],
    //     });

    //     tokenVals.push({ ...encodedVal, days: tokenTypes[j] });
    //   }
    //   newData.push(tokenVals);
    // }

    return newData;

    // return encoder.generateToken({
    //   secretKeyHex: 'e42fe95bcdc443718701e0e67ff1ddad',
    //   count: 3,
    //   value: 5,
    //   valueDivider: 1,

    //   restrictDigitSet: false,
    //   // tokenType: TokenTypes.DISABLE_PAYG,
    //   // usedCounts: [],
    //   startingCode: 674975504,
    // });

    // console.log(value)
    // console.log(count)
    // console.log(tokenType)
    // console.log(updatedCounts)

    // return { value, tokenType, count, updatedCounts };
  }

  async processCsv(filePath: string): Promise<string> {
    const rows = await this.parseCsv(filePath);

    const filteredRows = rows.filter((row) => row['Key']);
    const updatedRows = this.generateTokens(filteredRows);
    console.log({ updatedRows });

    // Save updated rows to a new CSV file
    const outputFilePath = 'output_with_tokens.csv';
    await this.writeCsv(updatedRows, outputFilePath);

    return outputFilePath;
  }

  private async parseCsv(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csvParser())
        // .on('data', (data) => results.push(data))
        .on('data', (data) => {
          const normalizedData = Object.keys(data).reduce((acc, key) => {
            const normalizedKey = key.trim().replace(/\s+/g, '_'); // Replace spaces with underscores
            acc[normalizedKey] = data[key];
            return acc;
          }, {});
          results.push(normalizedData);
        })
        .on('end', () => resolve(results))
        .on('error', (err) => reject(err));
    });
  }

  private generateTokens(rows: any[]): any[] {
    const tokenDays = [1, 2, 7, 'forever'];
    return rows
      .filter((row) => row['Key'])
      .map((row) => {
        const tokens = tokenDays.map((days) => {
          let deviceCount = 2;
          const token = encoder.generateToken({
            secretKeyHex: row['Key'],
            count: deviceCount++,
            value: days !== 'forever' ? (days as number) : undefined,
            valueDivider: Number(row['Time_Divider']),
            restrictDigitSet: row['Restricted_Digit_Mode'] == 1,
            tokenType:
              days === 'forever'
                ? TokenTypes.DISABLE_PAYG
                : TokenTypes.ADD_TIME,
            startingCode: Number(row['Starting_Code']),
          });
          return { days, token: token.finalToken };
        });

        tokens.forEach(({ days, token }) => {
          row[`token_${days}`] = token;
        });

        return row;
      });
  }

  private async writeCsv(data: any[], filePath: string): Promise<void> {
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: Object.keys(data[0]).map((key) => ({ id: key, title: key })),
    });

    await csvWriter.writeRecords(data);
  }

  private formatHex = (hexString: string): string => {
    if (!hexString.startsWith('0x')) {
      return `0x${hexString}`;
    }
    return hexString;
  };
}

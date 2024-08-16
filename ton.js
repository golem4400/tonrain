const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');

class Tone {
    constructor() {
        this.headers = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://tonrain.org/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
        };
    }

    log(msg) {
        console.log(`[*] ${msg}`);
    }

    async waitWithCountdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Chờ ${i.toString().cyan} giây để tiếp tục =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async getUserInfo(authorization) {
        const url = "https://tonrain.org/server/login";
        const headers = { ...this.headers, "Authorization": `tma ${authorization}` };
        return axios.get(url, { headers });
    }

    async click(authorization, clicks) {
        const url = `https://tonrain.org/server/clicks?clicks=${clicks}`;
        const headers = { ...this.headers, "Authorization": `tma ${authorization}` };
        return axios.get(url, { headers });
    }

    async performClicks(authorization, remainingClicks) {
        while (remainingClicks > 0) {
            try {
                const clickResponse = await this.click(authorization, remainingClicks);
                const { remainingClicks: newRemainingClicks, success } = clickResponse.data;

                if (success) {
                    this.log(`${'Tap thành công'.green}`);
                    this.log(`${'Năng lượng còn lại:'.magenta} ${newRemainingClicks.toString().cyan}`);

                    if (newRemainingClicks <= 10) {
                        this.log(`${'Năng lượng thấp, chuyển tài khoản!'.yellow}`);
                        break;
                    }

                    remainingClicks = newRemainingClicks;
                } else {
                    this.log(`${'Tap không thành công'.red}`);
                    break;
                }
            } catch (error) {
                console.log(`${'Error during clicks:'.red} ${error.message}`);
                break;
            }
        }
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
        while (true) {
            for (let no = 0; no < data.length; no++) {
                const authorization = data[no];

                try {
                    const userInfoResponse = await this.getUserInfo(authorization);
                    const { username, balance, remainingClicks, clicksPerTap, limitEnergy } = userInfoResponse.data.userData;

                    const formattedBalance = (parseFloat(balance) / 1000000000).toFixed(6);

                    console.log(`========== Tài khoản ${(no + 1).toString().cyan} | ${username.green} ==========`);
                    this.log(`${'Balance:'.magenta} ${formattedBalance.toString().cyan}`);
                    this.log(`${'Clicks per Tap:'.magenta} ${clicksPerTap.toString().cyan}`);
                    this.log(`${'Năng lượng:'.magenta} ${remainingClicks.toString().cyan} / ${limitEnergy.toString().cyan}`);

                    await this.performClicks(authorization, remainingClicks);

                } catch (error) {
                    console.log(`${'=========='.yellow} Tài khoản ${(no + 1).toString().cyan} | ${'Error'.red} ${'=========='.yellow}`);
                    if (error.response) {
                        console.log(`${'Status:'.red} ${error.response.status}`);
                        console.log(`${'Message:'.red} ${JSON.stringify(error.response.data)}`);
                    } else if (error.request) {
                        console.log('Không nhận được phản hồi từ server'.red);
                    } else {
                        console.log(`${'Error:'.red} ${error.message}`);
                    }
                    console.log(`${'Authorization:'.red} ${authorization}`);
                }
            }
            await this.waitWithCountdown(60);
        }

    }
}

if (require.main === module) {
    const tone = new Tone();
    tone.main().catch(err => {
        console.error(err.toString().red);
        process.exit(1);
    });
}
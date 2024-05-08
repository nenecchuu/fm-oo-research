// Path: main.ts

import axios from 'axios';
import { promises as fs } from 'fs';
import { of } from 'rxjs'

import credential from './credential.json'; // This import style requires "esModuleInterop", see "side notes"
import { API_LOGIN_URL, GET_PRODUCT_LIST_URL, GET_PRODUCT_DETAIL_URL } from './config.json'


function generateRandomIP(): string {
    return (Math.floor(Math.random() * 255) + 1)+"."+(Math.floor(Math.random() * 255))+"."+(Math.floor(Math.random() * 255))+"."+(Math.floor(Math.random() * 255));
}

async function fetchData() {
    try {
        let access_token: string = '';
        const RES: any[] = [];
        const meta = {
            ip: generateRandomIP(),
            os: "Mac OS",
            device: "desktop",
            browser: "Chrome",
            location: "Jakarta, Indonesia",
            lat: 0,
            long: 0,
            user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }

        const loginPayload = {
            email: credential.email,
            meta: JSON.stringify(meta),
            password: credential.password
        }

        console.log(`REQUESTING DATA FOR ${ loginPayload.email }...`)

        await axios.post(API_LOGIN_URL, loginPayload).then((loginRes: any) => {
            if (loginRes && loginRes.data && loginRes.data.data) {
                access_token = loginRes.data.data.access_token
                try {
                    const base64_body = access_token.split('.')[1]
                    const body_token_str = Buffer.from(base64_body, 'base64').toString('utf8');
                    const body_token = JSON.parse(body_token_str)

                    console.log(`Token obtained:`)
                    console.log(body_token)
                } catch (err) {
                    console.error("Error processing token:", err);
                    throw(err)
                }
            }

            return of(loginRes)
        }).catch((errRes) => {
            if(errRes && errRes.response && errRes.response.data) {
                console.log(`LOGIN FAILED: [${errRes.response.status}] ${errRes.response.data.message}`)
            }

            return of(errRes)
        });

        const authHeader = {
            Authorization: `Bearer ${access_token}`
        }

        const productListPayload = {
            limit: "25",
            sort_by: "name",
            sort: "asc",
            page: "1",
            since: "2024-04-06",
            until: "2024-05-06",
            has_omnichannel: "true",
            timestamp: "1714990805525",
            use_cache_header: "true",
            status: "live"
        }

        const productListRest = await axios.get(GET_PRODUCT_LIST_URL, { params: productListPayload, headers: authHeader });
        const dataProductList = productListRest.data.data.products;
        const dataPageInfo = productListRest.data.data.page_info;

        console.log(`Processing ${dataPageInfo.total_all_products} products`)
        console.log(`[${dataPageInfo.current_page}/${dataPageInfo.last_page}] Fetching ${dataProductList.length} products`)

        for (let i = 0; i < dataProductList.length; i++) {
            const p = dataProductList[i];

            console.log(`[${i+1}] ${p.name} [id: ${p['_id']['$oid']}]`)
            const productDetailRest = await axios.get(`${GET_PRODUCT_DETAIL_URL}/${p['_id']['$oid']}`, { headers: authHeader });
            const dataProductDetail = productDetailRest.data.data;
            RES.push(dataProductDetail)
        }

        await fs.writeFile('output.json', JSON.stringify(RES, null, 2));
        console.log("fetching data complete")
    } catch (error: any) {
        console.error('Error fetching data:', error.message);
    }
}

fetchData();
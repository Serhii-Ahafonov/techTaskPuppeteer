import * as puppeteer from 'puppeteer';
import * as readline from 'readline';
import {Browser, Page} from "puppeteer";
import * as open from 'open';

const input = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.goto('https://www.goodreads.com/choiceawards/best-books-2020' ,{ waitUntil: 'load', timeout: 0 });

    const genres = [];
    const titles = await page.$$(".category__copy");
    for (const title of titles) {
        genres.push(await page.evaluate(el => el.textContent!.trim(), title));
    }
    console.log(genres);

    input.question('Please copy your preferred genre from above list: ', genre => {
        app(browser, page, genre);
        input.close();
    });
})();


const chooseBookTitle = async (page: Page, genre: string) => {
    const linkHandlers = await page.$x(`//h4[contains(text(), '${genre}')] /following-sibling::div/img`);
    // @ts-ignore
    return await page.evaluate((el) => el.getAttribute('alt'), linkHandlers[0]);
};

async function app(browser: Browser, page: Page, genre: string) {
    const bookTitle = await chooseBookTitle(page, genre);
    console.log('Congratulations! Your choice is - ' + bookTitle);
    console.log('Wait a few seconds to be redirected to Amazon checkout!');
    const amazonBaseUrl = 'https://www.amazon.com';

    await page.goto(amazonBaseUrl);
    await page.type('#twotabsearchtextbox', bookTitle || bookTitle + ' book');
    await page.keyboard.press('Enter');

    const amazonBookTitle = await page.waitForSelector('.s-search-results [data-index="1"] h2 a');
    const amazonBookTitleUrl = await page.evaluate(el => el!.getAttribute('href'), amazonBookTitle);
    await page.goto(amazonBaseUrl + amazonBookTitleUrl, { waitUntil: 'load', timeout: 0 });
    const formatAndEditionUrls = await page.evaluate( () =>
      Array.from(document.querySelectorAll('li.swatchElement .a-button-inner a'), el => el.getAttribute('href'))
    );

    for (const url of formatAndEditionUrls) {
        try {
            await page.goto(amazonBaseUrl + url);
            const cart = await page.waitForSelector('#nav-cart');
            const addToCartExists = await page.evaluate(() => !!document.querySelector('#add-to-cart-button'));
            const buyingChoicesExists = await page.evaluate(() => !!document.querySelector('#buybox-see-all-buying-choices'));

            addToCartExists && await page.click('#add-to-cart-button');

            if (buyingChoicesExists) {
                await page.click('#buybox-see-all-buying-choices');
                await page.waitForSelector('#aod-offer-list div');
                await page.click('#aod-offer-list input + div input[name="submit.addToCart"]');
                await page.waitForSelector('#aod-offer-list input + div span.aok-hidden input[name="submit.addToCart"]');
                await page.click('#aod-close');
                const cartUrl = await page.evaluate(el => el!.getAttribute('href'), cart);
                await page.goto(amazonBaseUrl + cartUrl, { waitUntil: 'load', timeout: 0 });
            }

            if (addToCartExists || buyingChoicesExists) {
                await page.waitForSelector('input[name="proceedToRetailCheckout"]');
                await page.click('input[name="proceedToRetailCheckout"]');
                await page.waitForSelector('form[name="signIn"]');
                await open(page.url());
                await browser.close();
                return;
            }
        } catch(e) {
            if (e instanceof puppeteer.errors.TimeoutError) {
                return console.log('Something went wrong! Please, try again!');
                return await browser.close();
            }
        }
    }

    console.log('Sorry, no match on amazon found!');
    await browser.close();
}


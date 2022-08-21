import open from "open";
import puppeteer from'puppeteer';
import readline from 'readline';

const input = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {
    input.question('Please enter your preferred genre: ', genre => {
        const preferredGenre = genre.toLowerCase().replace(/ /g,'').replace('&', '-');
        app(preferredGenre);
        input.close();
    });
})();

async function app(genre) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const amazonBaseUrl = 'https://www.amazon.com';
    let selectedBookTitle;

    try {
        await page.goto('https://www.goodreads.com/choiceawards/best-'+ genre + '-books-2020');
        const selectedBook = await page.waitForSelector(".winner a.winningTitle", { timeout: 5000 });
        selectedBookTitle = await page.evaluate(el => el.textContent, selectedBook);
    } catch (e) {
        if (e instanceof puppeteer.errors.TimeoutError) {
            console.log('Genre is not available! Please, try again!');
            return await browser.close();
        }
    }

    await page.goto(amazonBaseUrl);
    await page.type('#twotabsearchtextbox', selectedBookTitle);
    await page.keyboard.press('Enter');

    const amazonBookTitle = await page.waitForSelector('.s-search-results [data-index="1"] h2 a');
    const amazonBookTitleUrl = await page.evaluate(el => el.getAttribute('href'), amazonBookTitle);
    await page.goto(amazonBaseUrl + amazonBookTitleUrl, { waitUntil: 'load', timeout: 0 });
    const formatAndEditionUrls = await page.evaluate( () =>
        Array.from(document.querySelectorAll('li.swatchElement .a-button-inner a'), el => el.getAttribute('href'))
    );

    for (const url of formatAndEditionUrls) {
        try {
            await page.goto(amazonBaseUrl + url, {waitUntil: 'load', timeout: 0});
            const cart = await page.waitForSelector('#nav-cart');
            const addToCartExists = await page.evaluate(() => !!document.querySelector('#add-to-cart-button'));
            const buyingChoicesExists = await page.evaluate(() => !!document.querySelector('#buybox-see-all-buying-choices'));

            addToCartExists && await page.click('#add-to-cart-button');

            if (buyingChoicesExists) {
                await page.click('#buybox-see-all-buying-choices');
                await page.waitForSelector('#aod-offer-list div');
                await page.click('#aod-offer-list input + div input[name="submit.addToCart"]');
                await page.waitForSelector('#aod-offer-list input + div span.aok-hidden input[name="submit.addToCart"]')
                await page.click('#aod-close');
                const cartUrl = await page.evaluate(el => el.getAttribute('href'), cart);
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
        } catch(e) {}
    }

    console.log('Sorry, no match on amazon found! ')
    await browser.close();
}
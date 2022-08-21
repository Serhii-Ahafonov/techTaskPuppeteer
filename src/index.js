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
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();

    //Good Reads
    await page.goto('https://www.goodreads.com/choiceawards/best-'+ genre + '-books-2020');
    const goodReadsTitleLink = await page.waitForSelector(".winner a.winningTitle");
    const bookTitle = await page.evaluate(el => el.textContent, goodReadsTitleLink);

    //Amazon
    await page.goto('https://www.amazon.com/');
    await page.type('#twotabsearchtextbox', bookTitle, { delay: 200 });
    await page.keyboard.press('Enter');

    const amazonBookTitle = await page.waitForSelector('.s-search-results [data-index="1"] h2 a');
    const amazonTitleLink = await page.evaluate(el => el.href, amazonBookTitle);
    await page.goto(amazonTitleLink, {waitUntil: 'load', timeout: 0});
    const formatAndEditionLinks = await page.evaluate( () =>
        Array.from(document.querySelectorAll('li.swatchElement .a-button-inner a'), el => el.href)
    );

    for (const link of formatAndEditionLinks) {
        try {
            await page.goto(link, {waitUntil: 'load', timeout: 0});
            const addToCartExists = await page.evaluate(() => !!document.querySelector('#add-to-cart-button'));
            const buyingChoicesExists = await page.evaluate(() => !!document.querySelector('#buybox-see-all-buying-choices'));

            if (addToCartExists) return addToCart(browser, page);
            if (buyingChoicesExists) return chooseOption(browser, page);
        } catch(e) {
            console.log(e.message);
        }
    }
}

async function addToCart(browser, page) {
    await page.click('#add-to-cart-button');
    await proceedToRetailCheckout(browser, page);
}

async function chooseOption(browser, page) {
    await page.click('#buybox-see-all-buying-choices');
    await page.waitForSelector('#aod-offer-list div');
    await page.click('#aod-offer-list input + div input[name="submit.addToCart"]');
    await page.waitForSelector('#aod-offer-list input + div span.aok-hidden input[name="submit.addToCart"]');
    await page.click('#aod-offer-list input + div form input');
    await proceedToRetailCheckout(browser, page);
}

async function proceedToRetailCheckout(browser, page) {
    await page.waitForSelector('input[name="proceedToRetailCheckout"]');
    await page.click('input[name="proceedToRetailCheckout"]');
    await page.waitForSelector('form[name="signIn"]');
    await open(page.url());
    browser.close();
}
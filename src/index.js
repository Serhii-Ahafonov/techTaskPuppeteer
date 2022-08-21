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
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    // await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.goodreads.com/choiceawards/best-'+ genre + '-books-2020');

    const titleElement = await page.waitForSelector(".winner a.winningTitle");
    const bookTitle = await page.evaluate(element => element.textContent, titleElement);

    //Search Book
    await page.goto('https://www.amazon.com/');
    await page.type('#twotabsearchtextbox', bookTitle, { delay: 200 });
    await page.keyboard.press('Enter');

    //Apply PaperBook Filter
    // const paperBackFilter = '[aria-labelledby="p_n_feature_browse-bin-title"] > li a'
    // await page.waitForSelector(paperBackFilter);
    // await page.click(paperBackFilter);

    //Select Top Search Result
    const firstSearchResultTitleSelector = '.s-search-results [data-index="1"] h2 a';
    await page.waitForSelector(firstSearchResultTitleSelector);
    await page.click(firstSearchResultTitleSelector);

    // Add To Cart Depends on
    //
    const format = await page.waitForSelector('li.swatchElement .a-button-inner a');
    const bookFormats = await page.$$('li.swatchElement');
    const bookFormatsLinks = await page.evaluate( () =>
        Array.from(document.querySelectorAll('li.swatchElement .a-button-inner a'), element => element.href)
    );



    for (const link of bookFormatsLinks) {
        try {
            await page.goto(link, {waitUntil: 'load', timeout: 0});
            const addToCartExists = await page.evaluate(() => !!document.querySelector('#add-to-cart-button'));
            const buyingChoicesExists = await page.evaluate(() => !!document.querySelector('#buybox-see-all-buying-choices'));

            console.log('buyingChoicesExists-' + buyingChoicesExists, 'addToCartExists-' + addToCartExists);

            if (addToCartExists) return addToCart(page);
            if (buyingChoicesExists) return chooseOption(page);
        } catch(e) {
            console.log(e.message)
        }
    }

    await open(page.url());
    browser.close();
}

async function addToCart(page) {
    await page.click('#add-to-cart-button');
    await proceedToRetailCheckout(page);
}

async function chooseOption(page) {
    await page.click('#buybox-see-all-buying-choices');
    await page.waitForSelector('#aod-offer-list');
    await page.click('#aod-offer-list input + div input');
    await page.waitForSelector('#aod-offer-list input + div form aod-view-cart-btn', { hidden: true });
    await page.click('#aod-offer-list input + div form input');
    await proceedToRetailCheckout(page);
}

async function proceedToRetailCheckout(page) {
    await page.waitForSelector('input[name="proceedToRetailCheckout"]');
    await page.click('input[name="proceedToRetailCheckout"]');
    await page.waitForSelector('form[name="signIn"]');
}
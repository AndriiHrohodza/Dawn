class InitBestSellers {
  constructor(container) {
    this.container = container;
    this.sectionId = this.container.getAttribute('data-section-id');
    this.wrapper = this.container.parentElement;
    this.sectionDataJson = this.wrapper.querySelector(`script[id="SectionData-${this.sectionId}"]`).textContent;
    this.sectionData = JSON.parse(this.sectionDataJson)
    this.collectionList = this.container.querySelector('.category-list');
    this.collectionListItems = this.collectionList.querySelectorAll('li.category-item');
    this.productCard = this.container.querySelector('.product-card');
    this.productCardLink = this.productCard.querySelector('a.product-card__link');
    this.productCardBadges = this.productCard.querySelector('.badges');
    this.productCardPriceWrapper = this.productCard.querySelector('.product-info .price-box');
    this.productCardTitle = this.productCard.querySelector('.product-info .product-name');
    this.productCardImageWrapper = this.productCard.querySelector('.product-image-wrapper');
    this.productWithListBtn = this.productCard.querySelector('.actions .wish-list-btn');
    this.productWithListModal = this.wrapper.querySelector('.wishlist-modal');
    this.productWithListModalContent = this.productWithListModal.querySelector('.wishlist-content');
    this.productWithListBtnClose = this.wrapper.querySelector('button.wishlist-close-btn');
    this.productAddToCardBtn = this.productCard.querySelector('button[data-submit-button]');
    this.productForm = this.wrapper.querySelector('form[data-product-form]');
    this.selectedItem = null;
    this.selectedItemData = null;

    this.initSubmit();
    this.initWithList();
    this.initWithListClose();
    this.initEventListeners()
  }

  renderBadgesHTML(tags) {
    if (!tags) return
    const tagsHTML = tags.map(tag => `<span class="badge ${tag.toLowerCase()}">${tag}</span>`).slice(0, 3)

    return this.productCardBadges.innerHTML = tagsHTML.join('')
  }

  renderPrice(priceVaries, ...args) {
    const [price, compare_at_price, start_from] = args;
    let priceHTML = '';

    if (priceVaries) {
      priceHTML = `<span class="start-from">${start_from}</span>`
    } else if (compare_at_price > price) {
      priceHTML = `
      <span class="current-price">${price}</span>
      <del class="old-price">${compare_at_price}</del>
      `
    } else {
      priceHTML = `<span class="price">${price}</span>`
    }

    return this.productCardPriceWrapper.innerHTML = priceHTML
  }

  renderImage(imageData) {
    const { image, image_alt, image_focal_point } = imageData;

    return this.productCardImageWrapper.innerHTML = `
      <picture>
        <source
          media="(max-width: 749px)"
          srcset="
            ${image}&width=343 1x,
            ${image}&width=686 2x
          "
        >
        <source
          media="(min-width: 750px)"
          srcset="
            ${image}&width=816 1x,
            ${image}&width=1632 2x
          "
        >
        <img
          src="${image}&width=816"
          alt="${image_alt}"
          loading="lazy"
          width="816"
          height="816"
          style="object-position: ${image_focal_point}"
          class="product-image"
        >
      </picture>
    `
  }

  initWithList() {
    this.productWithListBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleModalState();
      const wishlistMessage = this.productWithListModal.querySelector('.wishlist-message');
      const productName = this.productCardTitle.textContent;

      return wishlistMessage.innerHTML = `${productName} has been added to your wishlist`
    })
  }

  initWithListClose() {
    this.productWithListModal.addEventListener('click', e => {
      if (e.target.closest('button.wishlist-close-btn') || e.target.classList.contains('wishlist-modal')) this.toggleModalState()
    })
  }

  toggleModalState() {
    this.currentModalAriaHidden = this.productWithListModal.getAttribute('aria-hidden');
    this.productWithListModal.setAttribute('aria-hidden', !JSON.parse(this.currentModalAriaHidden));
    document.body.classList.toggle('modal-open');
    this.productWithListModal.classList.toggle('is-open');
  }

  handleProductCard(e) {
    e.preventDefault();
    this.selectedItem = e.currentTarget;
    this.selectedItemIndex = this.selectedItem.getAttribute('data-forloop-index');
    this.selectedItemData = this.sectionData.at(this.selectedItemIndex)
    const { id, available, compare_at_price, price, price_varies, start_from, image_data, title, url, tags } = this.selectedItemData?.product?.[0]

    this.collectionListItems.forEach((item) => {
      const itemButton = item.querySelector('button');

      item.getAttribute('data-forloop-index') != this.selectedItemIndex
        ? itemButton.setAttribute('aria-selected', false)
        : itemButton.setAttribute('aria-selected', true)
    })

    this.productCardLink.setAttribute('href', url);
    this.productCardTitle.innerHTML = title;
    this.renderBadgesHTML(tags);
    this.renderPrice(price_varies, price, compare_at_price, start_from);
    this.renderImage(image_data);
  }

  initSubmit() {
    this.productAddToCardBtn.addEventListener('click', e => {
      e.preventDefault();
      this.initAddToBag(e);
    })
  }

  initAddToBag(e) {
    e.preventDefault();
    const formData = this._serializeArray(this.productForm);
    const id = formData.find(item => item.name === 'id').value;
    const quantity = 1;

    const properties = formData.reduce((acc, item) => {
      let props;

      if (item.name.includes('properties')) {
        const prop = item.name.split('[')[1].split(']')[0];

        props = { ...acc, [prop]: item.value };
      }

      return props;
    }, {});

    const data = {
      items: [
        {
          id,
          quantity,
          properties
        }
      ]
    }

    this.addItem(data)
  }

  async addItem(data) {
    const params = {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const result = await fetch('/cart/add.js', params)
      .then((res) => res.json())
      .catch((error) => console.log(error));

    return result;
  }

  _serializeArray(form) {
    const formData = new FormData(form);

    return Array.from(formData).map(([name, value]) => ({
      name,
      value: value.toString()
    }));
  }

  initEventListeners() {
    this.collectionListItems.forEach(collectionItem => collectionItem.addEventListener('click', this.handleProductCard.bind(this)));
  }
}

if (!customElements.get('best-sellers-section')) {
  class bestSellersSection extends HTMLElement {
    constructor() {
      super();
      this.cleanup = null;
    }

    connectedCallback() {
      this.cleanup = new InitBestSellers(this)
    }

    disconnectedCallback() {
      if (this.cleanup) this.cleanup()
    }
  }

  customElements.define('best-sellers-section', bestSellersSection);
}
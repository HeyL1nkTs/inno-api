class ProductSchema {
    constructor({ name = '', price = 0, image_url = '', haveStock = false, stock = 0, supplies = [] } = {}) {
        this.name = name || '';
        this.price = price || 0;
        this.image_url = image_url || '';
        this.haveStock = haveStock || false;
        this.stock = stock || 0;
        this.supplies = supplies || [];
    }
}

module.exports = ProductSchema;
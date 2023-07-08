class APIFilters {
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }

  filter() {
    //Filter that could be search by any fields of model
    const queryCopy = { ...this.queryStr };

    delete queryCopy["sort"];
    delete queryCopy["fields"];
    delete queryCopy["q"];
    delete queryCopy["limit"];
    delete queryCopy["page"];

    //for cases when apply coparision operator gt, gte, lt, lte, in of mongoDB
    let queryStrNew = JSON.stringify(queryCopy);

    queryStrNew = queryStrNew.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`
    );
    this.query = this.query.find(JSON.parse(queryStrNew));
    return this;
  }
  sort() {
    if (this.query.sort) {
      this.query = this.query.sort(this.queryStr.sort);
    } else {
      this.query = this.query.sort("postingDate");
    }

    return this;
  }

  limitFields() {
    if (this.queryStr.fields) {
      const fields = this.queryStr.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select();
    }

    return this;
  }

  searchByQuery() {
    if (this.queryStr.q) {
      const query = this.queryStr.q.split("-").join(" ");
      this.query = this.query.find({ $text: { $search: '"' + query + '"' } });
    }

    return this;
  }

  pagination() {
    const { page, limit } = this.queryStr;
    const skipResults = (Number(page || 1) - 1) * Number(limit || 10);

    this.query = this.query.skip(skipResults).limit(limit);
    return this;
  }
}

module.exports = APIFilters;

/* 制作画面：選択中の道具に対する素材名検索とアイテム性能表示。 */
let craft_search_query = "";

function craft_recipe_matches(recipe, query) {
  const word = query.trim();
  return !word || recipe.必要素材.some(function (material) {
    return material[0].includes(word);
  });
}

function craft_recipe_stat(recipe) {
  const weapon = get_from_name(recipe.制作物, weapons_data);
  if (weapon) {
    const attack = weapon.攻撃力;
    const terms = attack.ダイス.map(function (dice) {
      return dice[0] + "d" + dice[1];
    });
    if (attack.固定値) {
      terms.push(String(attack.固定値));
    }
    return "攻撃力：" + (terms.join("+").replace(/\+-/g, "-") || "0");
  }
  const food = get_from_name(recipe.制作物, foods_data);
  return food ? "気力回復量：" + food.回復量 : null;
}

// 既存レシピウィンドウの制作処理を維持し、性能行だけを挿入する。
phina.define("Craft_recipe_window", {
  superClass: "Recipe_window",
  init: function (recipe) {
    this.superInit(recipe);
    const stat = craft_recipe_stat(recipe);
    if (!stat) return;

    this.stat = Label({ text: stat, fontSize: this.font_size, fill: White }).addChildTo(this);
    this.stat.align = "left";
    this.stat.baseline = "top";
    const lineHeight = this.font_size + this.行間;
    this.ウィンドウ高さ += lineHeight;
    this.ウィンドウ.height = this.ウィンドウ高さ;
    const originalSetPosition = this.set_position;
    this.set_position = function (x, y) {
      originalSetPosition.call(this, x, y);
      this.stat.setPosition(this.product.x, this.product.y + lineHeight);
      this.need_label.y += lineHeight;
      this.needs.forEach(function (label) { label.y += lineHeight; });
    };
  },
});

phina.define("Craft_scene", {
  superClass: "DisplayScene",
  init: function (option) {
    this.superInit(option);
    this.width = SCREEN_W;
    this.height = SCREEN_H;
    this.backgroundColor = Black;
    now_scene = "制作";
    const self = this;
    this.is_alerted = false;
    this.必要道具所持 = [];
    this.制作可能レシピ = [];
    this.表示レシピ = [];
    this.上下余白 = 20;
    this.上限 = 385;
    this.下限 = SCREEN_H - 350;
    this.始端位置 = this.上限;
    this.終端位置 = this.上限;
    this.押下中 = false;
    this.慣性 = 0;
    this.スクロール距離 = 0;

    // 一覧を専用レイヤーに置き、上部の検索欄・下部の操作欄より背面に描く。
    this.recipeLayer = DisplayElement().addChildTo(this);
    this.scroll_bar = RectangleShape({
      width: 15, height: 40, fill: White, strokeWidth: 0,
    }).addChildTo(this.recipeLayer);
    this.empty_label = Label({
      text: "該当するレシピなし", fontSize: 54, fill: White,
    }).addChildTo(this.recipeLayer).setPosition(CENTER_W, (this.上限 + this.下限) / 2);
    this.empty_label.hide();

    RectangleShape({
      width: SCREEN_W, height: this.上限,
      fill: Black, stroke: White, strokeWidth: 10,
    }).addChildTo(this).setPosition(CENTER_W, this.上限 / 2);
    Label({ text: "制作可能なもの一覧", fontSize: 64, fill: White })
      .addChildTo(this).setPosition(CENTER_W, 95);
    this.SP = Label({ text: "気力：" + player.気力, fontSize: 64, fill: White })
      .addChildTo(this).setPosition(CENTER_W, 185);

    RectangleShape({
      width: SCREEN_W, height: 350,
      fill: Black, stroke: White, strokeWidth: 10,
    }).addChildTo(this).setPosition(CENTER_W, SCREEN_H - 175);
    Button({
      text: "戻る", fontSize: 64,
      width: 300, height: 150, cornerRadius: 0,
      fill: darkGray, stroke: lightGray, strokeWidth: 15,
    }).addChildTo(this).setPosition(SCREEN_W - 200, SCREEN_H - 250)
      .onpointend = function () {
        craft_search_query = "";
        set_cookies();
        SoundManager.play("backhome");
        self.exit("ホーム");
      };

    this.now_tool = Label({ text: "", fontSize: 64, fill: White })
      .addChildTo(this).setPosition(CENTER_W - 175, SCREEN_H - 300);
    this.go_left = Button({
      text: "---", fontSize: 48,
      width: 300, height: 75, cornerRadius: 0,
      fill: "#1E1E1E", fontColor: lightGray, stroke: lightGray, strokeWidth: 15,
    }).addChildTo(this).setPosition(CENTER_W - 345, SCREEN_H - 212);
    this.go_right = Button({
      text: "---", fontSize: 48,
      width: 300, height: 75, cornerRadius: 0,
      fill: "#1E1E1E", fontColor: lightGray, stroke: lightGray, strokeWidth: 15,
    }).addChildTo(this).setPosition(CENTER_W - 5, SCREEN_H - 212);
    const versionLabel = Label({ text: "バージョン：" + version, fill: White })
      .addChildTo(this).setPosition(25, SCREEN_H - 25);
    versionLabel.align = "left";
    versionLabel.baseline = "bottom";

    this.set_recipes();
    current_recipe_page = Math.max(0, Math.min(current_recipe_page, this.制作可能レシピ.length - 1));
    this.rebuild_recipe_list();
    this.mount_search_input();

    this.go_left.onpointend = function () { self.switch_tool(-1); };
    this.go_right.onpointend = function () { self.switch_tool(1); };
    this.update_tool_buttons();

    this.on("pointstart", function (event) {
      if (event.pointer.y < this.上限 || event.pointer.y > this.下限 || !this.表示レシピ.length) return;
      this.押下中 = true;
      this.慣性 = 0;
      this.スクロール開始時間 = time;
      this.スクロール開始位置 = event.pointer.y;
      this.前フレームの座標 = event.pointer.y;
      this.スクロール距離 = 0;
    });
    this.on("pointstay", function (event) {
      if (!this.押下中) return;
      this.スクロール距離 = event.pointer.y - this.スクロール開始位置;
      this.前フレームの差分 = event.pointer.y - this.前フレームの座標;
      this.前フレームの座標 = event.pointer.y;
    });
    this.on("pointend", function () {
      if (!this.押下中) return;
      this.押下中 = false;
      this.始端位置 = this.clamp_scroll(this.始端位置 + this.スクロール距離);
      this.慣性 = Math.max(-50, Math.min(50, (this.前フレームの差分 || 0) * 2));
      this.スクロール距離 = 0;
    });
    this.on("exit", function () { this.unmount_search_input(); });
  },

  // 道具の所持条件は従来の判定を保持。結果の絞り込みはこの後に行う。
  set_recipes: function () {
    this.必要道具所持 = recipes_data.map(function (group) {
      return group[0] === "無し" || player.has_item(group[0]) > 0;
    });
    this.制作可能レシピ = recipes_data.filter(function (group, index) {
      return this.必要道具所持[index];
    }, this);
  },

  rebuild_recipe_list: function () {
    this.表示レシピ.forEach(function (item) { item.remove(); });
    this.表示レシピ = [];
    const group = this.制作可能レシピ[current_recipe_page];
    const recipes = group ? group[1].filter(function (recipe) {
      return craft_recipe_matches(recipe, craft_search_query);
    }) : [];
    recipes.forEach(function (recipe) {
      this.表示レシピ.push(Craft_recipe_window(recipe).addChildTo(this.recipeLayer));
    }, this);
    this.empty_label.setVisible(recipes.length === 0);
    this.始端位置 = this.上限;
    this.スクロール距離 = 0;
    this.慣性 = 0;
    this.押下中 = false;
    this.set_recipes_pos();
  },

  scroll_content_height: function () {
    return this.表示レシピ.reduce(function (total, item) {
      return total + item.ウィンドウ.height + 20;
    }, 0);
  },

  clamp_scroll: function (position) {
    const min = Math.min(this.上限, this.下限 - this.scroll_content_height());
    return Math.max(min, Math.min(this.上限, position));
  },

  set_recipes_pos: function () {
    const distance = this.スクロール距離;
    const start = this.clamp_scroll(this.始端位置 + distance);
    let cursor = start;
    this.表示レシピ.forEach(function (item) {
      cursor += this.上下余白 + item.ウィンドウ.height / 2;
      item.set_position(CENTER_W, cursor);
      cursor += item.ウィンドウ.height / 2;
      // 画面の上下に隠れた制作ボタンはタップ対象にしない。
      item.make.interactive = item.make.y - item.make.height / 2 >= this.上限 &&
        item.make.y + item.make.height / 2 <= this.下限;
    }, this);
    this.終端位置 = cursor;
    const viewport = this.下限 - this.上限;
    const content = this.scroll_content_height();
    if (content <= viewport || !this.表示レシピ.length) {
      this.scroll_bar.hide();
      return;
    }
    this.scroll_bar.show();
    const height = Math.max(40, viewport * viewport / content);
    this.scroll_bar.height = height;
    const progress = (this.上限 - start) / (content - viewport);
    this.scroll_bar.setPosition(SCREEN_W - 15, this.上限 + height / 2 + (viewport - height) * progress);
  },

  switch_tool: function (delta) {
    const target = current_recipe_page + delta;
    if (target < 0 || target >= this.制作可能レシピ.length) return;
    current_recipe_page = target;
    SoundManager.play("select");
    this.rebuild_recipe_list();
    this.update_tool_buttons();
  },

  update_tool_buttons: function () {
    const groups = this.制作可能レシピ;
    this.now_tool.text = "使う道具：" + (groups[current_recipe_page] ? groups[current_recipe_page][0] : "無し");
    const buttons = [this.go_left, this.go_right];
    const targets = [current_recipe_page - 1, current_recipe_page + 1];
    buttons.forEach(function (button, index) {
      const valid = targets[index] >= 0 && targets[index] < groups.length;
      button.text = valid ? groups[targets[index]][0] : "---";
      button.fontColor = valid ? White : lightGray;
      button.fill = valid ? darkGray : "#1E1E1E";
      button.interactive = valid;
    });
  },

  mount_search_input: function () {
    const self = this;
    const container = document.createElement("div");
    const input = document.createElement("input");
    const clear = document.createElement("button");
    input.type = "text";
    input.value = craft_search_query;
    input.placeholder = "必要素材で検索";
    input.setAttribute("aria-label", "必要素材名でレシピを検索");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("inputmode", "search");
    input.spellcheck = false;
    clear.type = "button";
    clear.textContent = "×";
    clear.setAttribute("aria-label", "検索文字をクリア");
    container.style.cssText = "position:fixed;display:flex;z-index:100;pointer-events:none;";
    input.style.cssText = "flex:1;min-width:0;box-sizing:border-box;background:#fff;color:#111;border:2px solid #999;border-radius:4px;pointer-events:auto;";
    clear.style.cssText = "flex:none;box-sizing:border-box;background:#333;color:#fff;border:2px solid #aaa;border-radius:4px;pointer-events:auto;touch-action:manipulation;";
    container.appendChild(input);
    container.appendChild(clear);
    document.body.appendChild(container);
    this.search_container = container;
    this.search_input = input;

    function filter() {
      if (craft_search_query === input.value) return;
      craft_search_query = input.value;
      self.rebuild_recipe_list();
    }
    input.addEventListener("input", filter);
    input.addEventListener("compositionend", filter);
    ["keydown", "keyup", "keypress"].forEach(function (eventName) {
      input.addEventListener(eventName, function (event) {
        event.stopPropagation();
        if (eventName === "keydown" && event.key === "Enter" && !event.isComposing) input.blur();
      });
    });
    clear.addEventListener("click", function () {
      input.value = "";
      filter();
      input.focus();
    });
    this.position_search_input = function () {
      const canvas = document.body.querySelector("canvas");
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scale = rect.width / SCREEN_W;
      container.style.left = rect.left + 65 * scale + "px";
      container.style.top = rect.top + 270 * scale + "px";
      container.style.width = 950 * scale + "px";
      container.style.height = 70 * scale + "px";
      container.style.gap = 15 * scale + "px";
      input.style.fontSize = Math.max(14, 40 * scale) + "px";
      input.style.padding = "0 " + 16 * scale + "px";
      clear.style.width = 130 * scale + "px";
      clear.style.fontSize = Math.max(16, 55 * scale) + "px";
    };
    window.addEventListener("resize", this.position_search_input);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", this.position_search_input);
      window.visualViewport.addEventListener("scroll", this.position_search_input);
    }
    this.position_search_input();
  },

  unmount_search_input: function () {
    if (!this.search_container) return;
    window.removeEventListener("resize", this.position_search_input);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener("resize", this.position_search_input);
      window.visualViewport.removeEventListener("scroll", this.position_search_input);
    }
    this.search_container.remove();
    this.search_container = null;
    this.search_input = null;
  },

  update: function (app) {
    time = app.currentTime;
    bgm_check(app);
    if (is_reload) {
      is_reload = false;
      const group = this.制作可能レシピ[current_recipe_page];
      const previousTool = group && group[0];
      this.set_recipes();
      const found = this.制作可能レシピ.findIndex(function (item) { return item[0] === previousTool; });
      current_recipe_page = found >= 0 ? found :
        Math.max(0, Math.min(current_recipe_page, this.制作可能レシピ.length - 1));
      this.rebuild_recipe_list();
      this.update_tool_buttons();
    }
    if (!this.押下中 && Math.abs(this.慣性) > 0.25) {
      const next = this.clamp_scroll(this.始端位置 + this.慣性);
      if (next === this.始端位置) this.慣性 = 0;
      else this.慣性 *= 0.9;
      this.始端位置 = next;
    }
    this.set_recipes_pos();
    this.SP.text = "気力：" + player.気力;
    this.SP.fill = White;
    if (player.気力 < (5 + Math.floor(player.移動距離 / 10000)) * 2) {
      this.SP.fill = Red;
      if (!this.is_alerted) {
        SoundManager.play("alert");
        this.is_alerted = true;
      }
    }
  },
});

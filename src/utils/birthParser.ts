/**
 * 解析留影叙佳期数据
 * @since Beta v0.9.1
 */

/**
 * 解析资源数据
 * @since Beta v0.9.1
 */
export function parseBirthSrc(data: Document): TGApp.Archive.Birth.GalSrcFull {
  const res: TGApp.Archive.Birth.GalSrcFull = { resource: [], roles: [] };
  const tmpRes: Array<TGApp.Archive.Birth.GalSrcRes> = [];
  const tmpRoles: Array<TGApp.Archive.Birth.GalSrcRole> = [];
  const resElements = data.querySelector("resource");
  const roleElements = data.querySelector("characters");
  if (resElements !== null) {
    for (let ci = 0; ci < resElements.children.length; ci++) {
      const child = resElements.children.item(ci);
      if (child === null) continue;
      const tmpResItem: TGApp.Archive.Birth.GalSrcRes = {
        id: child.id ?? "",
        group: child.getAttribute("group") ?? "",
        type: child.tagName,
        rel: child.getAttribute("rel") ?? "",
        src: child.getAttribute("src") ?? "",
      };
      tmpRes.push(tmpResItem);
    }
    res.resource = tmpRes;
  }
  if (roleElements !== null) {
    for (let ri = 0; ri < roleElements.children.length; ri++) {
      const child = roleElements.children.item(ri);
      if (child === null) continue;
      const tmpRoleItem: TGApp.Archive.Birth.GalSrcRole = {
        id: child.getAttribute("id") ?? "",
        name: child.getAttribute("name") ?? "",
        key: child.getAttribute("key") ?? undefined,
      };
      tmpRoles.push(tmpRoleItem);
    }
    res.roles = tmpRoles;
  }
  return res;
}

/**
 * 解析Gal数据
 * @since Beta v0.9.1
 * @param data - XML数据
 * @param src - 解析的资源数据
 * @returns 解析结果
 */
export function parseBirthGal(
  data: Document,
  src: TGApp.Archive.Birth.GalSrcFull,
): TGApp.Archive.Birth.GalScenes {
  const scenes: TGApp.Archive.Birth.GalScenes = [];
  const sceneElements = data.querySelectorAll("scene");
  if (sceneElements.length > 1) console.log(sceneElements);
  for (let si = 0; si < sceneElements.length; si++) {
    const sceneData = parseBirthScenes(sceneElements.item(si), src);
    scenes.push(sceneData);
  }
  return scenes;
}

/**
 * 解析场景数据
 * @since Beta v0.9.1
 * @param data - XML数据
 * @param src - 解析的资源数据
 * @returns 解析结果
 */
function parseBirthScenes(
  data: Element,
  src: TGApp.Archive.Birth.GalSrcFull,
): TGApp.Archive.Birth.GalScriptScene {
  const res: TGApp.Archive.Birth.GalScriptScene = {
    id: data.getAttribute("id") ?? "",
    title: data.getAttribute("title") ?? "",
    prev: data.getAttribute("prev") ?? undefined,
    bg: "",
    comments: [],
  };
  const bgElement = data.querySelector("bg");
  if (bgElement !== null) {
    const bgKey = bgElement.getAttribute("img") ?? "";
    res.bg = src.resource.find((i) => i.id === bgKey)?.src ?? "";
  }
  const dialogElements = data.querySelectorAll("simple_dialog");
  const tmpScripts: Array<TGApp.Archive.Birth.GalDialog> = [];
  for (let di = 0; di < dialogElements.length; di++) {
    const dialogEl = dialogElements.item(di);
    const imgKey = dialogEl.getAttribute("img") ?? "";
    let img2Src = "";
    const imgSrc = src.resource.find((i) => i.id === imgKey)?.src ?? "";
    if (imgKey.startsWith("aether")) {
      img2Src = src.resource.find((i) => i.id === imgKey.replace("aether", "lumine"))?.src ?? "";
    }
    const roleKey = dialogEl.getAttribute("chara") ?? "";
    let roleName = src.roles.find((i) => i.id === roleKey)?.name ?? "";
    if (roleName === "text") roleName = "";
    const scriptItem: TGApp.Archive.Birth.GalDialog = {
      key: dialogEl.getAttribute("key") ?? "",
      role: roleName,
      img: imgSrc,
      img2: img2Src,
      pos: dialogEl.getAttribute("pos") ?? undefined,
      text: dialogEl.textContent ?? "",
    };
    tmpScripts.push(scriptItem);
  }
  res.comments = tmpScripts;
  return res;
}

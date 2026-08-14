import { NextResponse } from "next/server";

/**
 * Error responses across this app have historically been a single string
 * with the Chinese and English text mashed together (e.g. "不能删除
 * Cannot delete"), so client code had no way to only show the half that
 * matches the current language toggle. This keeps `error` as that same
 * combined string for any older call site that just dumps it verbatim,
 * while adding `errorZh`/`errorEn` so updated call sites can pick the
 * right one via <Bi>.
 */
export function bilingualError(zh: string, en: string, status: number) {
  return NextResponse.json({ error: `${zh} ${en}`, errorZh: zh, errorEn: en }, { status });
}

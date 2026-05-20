"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AddCustomSiteInput } from "@/app/tools/_components/use-custom-site-options";

type AddCustomSiteDialogProps = {
  onAdd: (input: AddCustomSiteInput) => { ok: true } | { ok: false; message: string };
};

const INITIAL_FORM: AddCustomSiteInput = {
  label: "",
  storeDomain: "",
  adminAccessToken: "",
};

export function AddCustomSiteDialog({ onAdd }: AddCustomSiteDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddCustomSiteInput>(INITIAL_FORM);
  const [errorMessage, setErrorMessage] = useState("");

  const updateForm = (field: keyof AddCustomSiteInput, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    const result = onAdd(form);

    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    setErrorMessage("");
    setForm(INITIAL_FORM);
    setOpen(false);
  };

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        新增临时店铺
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增临时 Shopify 店铺</DialogTitle>
            <DialogDescription>
              新增后会立即加入下拉选项并可直接使用，仅保存在当前浏览器且当天有效，次日自动失效。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm text-zinc-700">
              店铺显示名称
              <Input
                value={form.label}
                onChange={(event) => updateForm("label", event.target.value)}
                placeholder="例如：Valerion-DE / OtherBrand-DE"
              />
            </label>

            <label className="grid gap-1.5 text-sm text-zinc-700">
              Shopify 店铺域名
              <Input
                value={form.storeDomain}
                onChange={(event) => updateForm("storeDomain", event.target.value)}
                placeholder="例如：example.myshopify.com"
              />
            </label>

            <label className="grid gap-1.5 text-sm text-zinc-700">
              Admin Access Token
              <Input
                value={form.adminAccessToken}
                onChange={(event) => updateForm("adminAccessToken", event.target.value)}
                placeholder="shpat_xxx"
                type="password"
              />
            </label>

            {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleSubmit}>
              保存并添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

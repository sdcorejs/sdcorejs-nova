// Consumer page built only from the public subpaths of the packed tarball.
import { useState } from 'react';

import { Alert } from '@sdcorejs/nova/alert';
import { Avatar, AvatarGroup } from '@sdcorejs/nova/avatar';
import { Badge } from '@sdcorejs/nova/badge';
import { Breadcrumb } from '@sdcorejs/nova/breadcrumb';
import { Button, ButtonGroup } from '@sdcorejs/nova/button';
import { Card, Section } from '@sdcorejs/nova/card';
import { Checkbox } from '@sdcorejs/nova/checkbox';
import { DataState, Progress } from '@sdcorejs/nova/data-state';
import { Field, focusFirstInvalid } from '@sdcorejs/nova/field';
import { Input } from '@sdcorejs/nova/input';
import { Link } from '@sdcorejs/nova/link';
import { RadioGroup } from '@sdcorejs/nova/radio-group';
import { Switch } from '@sdcorejs/nova/switch';
import { NovaProvider } from '@sdcorejs/nova/theme';

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export function App() {
  const [theme, setTheme] = useState('light');
  const [clicks, setClicks] = useState(0);
  const [dismisses, setDismisses] = useState(0);
  const [formData, setFormData] = useState(null);

  const onSubmit = (event) => {
    event.preventDefault();
    focusFirstInvalid(event.currentTarget);
    setFormData(JSON.stringify([...new FormData(event.currentTarget).entries()]));
  };

  return (
    <NovaProvider theme={theme} locale="vi">
      <main data-testid="nova-app" className="fixture-surface">
        <Breadcrumb items={[{ id: 'home', label: 'Trang chủ', href: '/' }, { id: 'here', label: 'Fixture Vite' }]} />
        <ButtonGroup label="Giao diện">
          <Button variant="secondary" onClick={() => setTheme('dark')}>Chế độ tối</Button>
          <Button variant="secondary" onClick={() => setTheme('light')}>Chế độ sáng</Button>
        </ButtonGroup>
        <Card data-testid="card">
          <Section title="Hồ sơ" actions={<Badge tone="success">Đã xác minh</Badge>}>
            <AvatarGroup label="Thành viên" max={2}>
              <Avatar name="Ảnh" src={PIXEL} />
              <Avatar name="Nguyễn An" />
              <Avatar name="Trần Bình" />
            </AvatarGroup>
            <Progress label="Hoàn thành hồ sơ" value={60} />
            <Link href="https://example.com" target="_blank">Trang ngoài</Link>
          </Section>
        </Card>
        <form onSubmit={onSubmit} noValidate>
          <Field label="Email">
            <Input nameFromField type="email" autoComplete="email" />
          </Field>
          <Checkbox label="Đồng ý điều khoản" name="agree" submissionValue="yes" />
          <Field label="Lựa chọn">
            <RadioGroup nameFromField name="choice" options={[{ value: 1, label: 'Một (số)' }, { value: '1', label: 'Một (chuỗi)' }]} />
          </Field>
          <Switch label="Nhận thông báo" />
          <Button type="submit">Gửi</Button>
        </form>
        <output data-testid="formdata">{formData ?? ''}</output>
        <Button onClick={() => setClicks((count) => count + 1)}>Tăng</Button>
        <output data-testid="clicks">{clicks}</output>
        <Alert tone="info" title="Thông báo" onDismiss={() => setDismisses((count) => count + 1)}>Nội dung thông báo.</Alert>
        <output data-testid="dismisses">{dismisses}</output>
        <DataState state="ready">{0}</DataState>
      </main>
    </NovaProvider>
  );
}

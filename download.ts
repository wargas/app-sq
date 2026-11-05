import axios from "axios";
import { createWriteStream, existsSync, ReadStream } from "fs";
import fs from 'fs/promises'
import path from "path";
import { pipeline } from "stream/promises";
import { sanitizeFilename } from "./lib/utils";

const client = axios.create({
    baseURL: 'https://api.estrategiaconcursos.com.br/api/aluno',
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzIiwianRpIjoiNzc4YmMwN2ZhNjE4YmJhYTc3ZTI1ZmFmNWY4YmFlZDY1ZjZhNjA0YjZlNzlhYTUxMzlhMDE4ODJhMGRiODIyMDEyYzhhMTkwNWNmMDY5YWEiLCJpYXQiOjE3OTM4NzEzNDUuNTExNzM5LCJuYmYiOjE3OTM4NzEzNDUuNTExNzQxLCJleHAiOjE3OTY0NjMzNDUuNTA2NjY2LCJzdWIiOiI2MTc0Nzk2Iiwic2NvcGVzIjpbXX0.tjyprKiRDZY0IYSqoPsccMZFVi9rx7gIXpLP5HQueWv1NCIZ7Jp4ZW62ghXfJ4c6t3HtYgPOuCPLmgpaPo2U5o7kVAO1NH7PKZGjINOwL9P8dUNo1ggfBOP3S5Uiw02hzBpDCUSFIRApkYEfCGZuMcGHObKZPnCF5NXm7KiYOwW8GhqnZzoIN6Ws1qSSPhH1mWTy1i7a_sKQLx5wcOf41tRbr2qRWXkEmhstvHnzAdPGajSbDpS9YFiVgnEMuS4mUWc5nE1vvMppWGT5oJdg4ND3wKHGpUgL2K3h1P3alwkLVMkqAKdiv_qyQSztn3OmJp3JNjz_oo05R_QsAM1L7x7kjl7FWOmi4ydavASjecAQ6WJZcxFkEf37o4hzq__ex_1V2fmyAsGDE2MkJExi7ydylfAsXY-5KEzV3HANsc4fyup00r2M2GrHgvzvcCj16ua4e-NJD2aGeIXf_awJeXomiTqPlyNkuE4lO9PxBBE0CyGpxx-Ha16Xl8A5vsRY5wgShExZ56mEaeR4FL6WUXy8LDimnNz1X92MtEvqWSsUzfTZYqXGAfhFeyXQ42bre_9W6gk9wx9Tgl0qF3OtD6da5aKg-hXlWs-OXKORgquIcjaXt9DwRFHcCnF-At1NQG1j0nt1NnyjqPuppBJ80CUcDgk-J-Im8gQUskKxYcQ`,
    }
})

const pacote = await client.get(`pacote/383177`);

const out = `/Users/wargasteixeira/Desktop/Mailza/PDF/`
for await (const curso of pacote.data.data.cursos) {
    const cursoReq = await client.get(`curso/${curso.id}`)

    try {
        await fs.mkdir(path.join(out, curso.nome))
    } catch (e) { }

    for await (const aula of cursoReq.data.data.aulas) {

        const filePath = path.join(path.join(out, curso.nome, sanitizeFilename(aula.nome + ".pdf")))

        if(existsSync(filePath)) continue;

        const { data } = await axios.get(aula.pdf, { responseType: "stream" })

        const ws = createWriteStream(filePath)

        await pipeline(data, ws)

        console.log(curso.nome, aula.nome)
    }

    // break
}
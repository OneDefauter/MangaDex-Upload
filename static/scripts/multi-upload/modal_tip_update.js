function updateModalTipPC() {
    const tipModal = document.getElementById('tipModal');
    tipModal.innerHTML = `
        <div class="tip-modal-content">
            <!-- Botão "X" para fechar -->
            <span class="tip-close">&times;</span>
            
            <!-- Página 1: Introdução -->
            <div class="tip-page" id="tipPage1">
                <h2>${t_tip_pc.title}</h2>
                <p>
                    ${t_tip_pc.description}
                </p>
                <p><strong>${t_tip_pc.shortcuts}</strong></p>
                <ul>
                    <li>${t_tip_pc.shortcut_select_all}</li>
                    <li>${t_tip_pc.shortcut_select_specific}</li>
                    <li>${t_tip_pc.shortcut_select_range}</li>
                </ul>
        
                <div class="tip-navigation">
                    <!-- Indicadores de página -->
                    <div class="tip-steps">
                        <span class="dot" data-step="0"></span>
                        <span class="dot" data-step="1"></span>
                        <span class="dot" data-step="2"></span>
                        <span class="dot" data-step="3"></span>
                        <span class="dot" data-step="4"></span>
                        <span class="dot" data-step="5"></span>
                        <span class="dot" data-step="6"></span>
                        <span class="dot" data-step="7"></span>
                    </div>

                    <!-- Botão "Continuar" para ir à página 2 -->
                    <button class="tip-next">${t_tip_pc.next}</button>
                </div>
            </div>
        
            <!-- Página 2: Criar grupo: modo 1 -->
            <div class="tip-page" id="tipPage2" style="display: none;">
                <h2>${t_tip_pc.create_group_mode_1_title}</h2>
                <img src="/static/tips/multi_upload/create_group-ctrl_a.gif" alt="${t_tip_pc.create_group_mode_1_img_alt}" />
                <p>
                    ${t_tip_pc.create_group_mode_1_description}
                </p>
                </p>${t_tip_pc.create_group_mode_1_tip}</p>
                <ul>
                    <li>
                        ${t_tip_pc.create_group_mode_1_tip_details}
                    </li>
                </ul>
        
                <div class="tip-navigation">
                    <button class="tip-prev">${t_tip_pc.prev}</button>
            
                    <!-- Indicadores de página -->
                    <div class="tip-steps">
                        <span class="dot" data-step="0"></span>
                        <span class="dot" data-step="1"></span>
                        <span class="dot" data-step="2"></span>
                        <span class="dot" data-step="3"></span>
                        <span class="dot" data-step="4"></span>
                        <span class="dot" data-step="5"></span>
                        <span class="dot" data-step="6"></span>
                        <span class="dot" data-step="7"></span>
                    </div>

                    <button class="tip-next">${t_tip_pc.next}</button>
                </div>
            </div>
        
            <!-- Página 3: Criar grupo: modo 2 -->
            <div class="tip-page" id="tipPage3" style="display: none;">
                <h2>${t_tip_pc.create_group_mode_2_title}</h2>
                <img src="/static/tips/multi_upload/create_group-crtl_click.gif" alt="${t_tip_pc.create_group_mode_2_img_alt}" />
                <p>
                    ${t_tip_pc.create_group_mode_2_description}
                </p>
        
                <div class="tip-navigation">
                    <button class="tip-prev">${t_tip_pc.prev}</button>
            
                    <!-- Indicadores de página -->
                    <div class="tip-steps">
                        <span class="dot" data-step="0"></span>
                        <span class="dot" data-step="1"></span>
                        <span class="dot" data-step="2"></span>
                        <span class="dot" data-step="3"></span>
                        <span class="dot" data-step="4"></span>
                        <span class="dot" data-step="5"></span>
                        <span class="dot" data-step="6"></span>
                        <span class="dot" data-step="7"></span>
                    </div>

                    <button class="tip-next">${t_tip_pc.next}</button>
                </div>
            </div>
        
            <!-- Página 4: Criar grupo: modo 3 -->
            <div class="tip-page" id="tipPage4" style="display: none;">
                <h2>${t_tip_pc.create_group_mode_3_title}</h2>
                <img src="/static/tips/multi_upload/create_group-shift_click.gif" alt="${t_tip_pc.create_group_mode_3_img_alt}" />
                <p>
                    ${t_tip_pc.create_group_mode_3_description}
                </p>
                <p>${t_tip_pc.create_group_mode_3_additional_info}</p>
                <ul>
                    <li>
                        ${t_tip_pc.create_group_mode_3_additional_info_details}
                    </li>
                </ul>
        
                <div class="tip-navigation">
                    <button class="tip-prev">${t_tip_pc.prev}</button>
            
                    <!-- Indicadores de página -->
                    <div class="tip-steps">
                        <span class="dot" data-step="0"></span>
                        <span class="dot" data-step="1"></span>
                        <span class="dot" data-step="2"></span>
                        <span class="dot" data-step="3"></span>
                        <span class="dot" data-step="4"></span>
                        <span class="dot" data-step="5"></span>
                        <span class="dot" data-step="6"></span>
                        <span class="dot" data-step="7"></span>
                    </div>

                    <button class="tip-next">${t_tip_pc.next}</button>
                </div>
            </div>
        
            <!-- Página 5: Adicionar capítulos: modo 1 -->
            <div class="tip-page" id="tipPage5" style="display: none;">
                <h2>${t_tip_pc.add_chapter_mode_1_title}</h2>
                <img src="/static/tips/multi_upload/edit_group_add-ctrl_click.gif" alt="${t_tip_pc.add_chapter_mode_1_img_alt}" />
                <p>
                    ${t_tip_pc.add_chapter_mode_1_description}
                </p>
        
                <div class="tip-navigation">
                    <button class="tip-prev">${t_tip_pc.prev}</button>
            
                    <!-- Indicadores de página -->
                    <div class="tip-steps">
                        <span class="dot" data-step="0"></span>
                        <span class="dot" data-step="1"></span>
                        <span class="dot" data-step="2"></span>
                        <span class="dot" data-step="3"></span>
                        <span class="dot" data-step="4"></span>
                        <span class="dot" data-step="5"></span>
                        <span class="dot" data-step="6"></span>
                        <span class="dot" data-step="7"></span>
                    </div>

                    <button class="tip-next">${t_tip_pc.next}</button>
                </div>
            </div>
        
            <!-- Página 6: Adicionar capítulos: modo 2 -->
            <div class="tip-page" id="tipPage6" style="display: none;">
                <h2>${t_tip_pc.add_chapter_mode_2_title}</h2>
                <img src="/static/tips/multi_upload/edit_group_add-shift_click.gif" alt="${t_tip_pc.add_chapter_mode_2_img_alt}" />
                <p>
                    ${t_tip_pc.add_chapter_mode_2_description}
                </p>
        
                <div class="tip-navigation">
                    <button class="tip-prev">${t_tip_pc.prev}</button>
            
                    <!-- Indicadores de página -->
                    <div class="tip-steps">
                        <span class="dot" data-step="0"></span>
                        <span class="dot" data-step="1"></span>
                        <span class="dot" data-step="2"></span>
                        <span class="dot" data-step="3"></span>
                        <span class="dot" data-step="4"></span>
                        <span class="dot" data-step="5"></span>
                        <span class="dot" data-step="6"></span>
                        <span class="dot" data-step="7"></span>
                    </div>

                    <button class="tip-next">${t_tip_pc.next}</button>
                </div>
            </div>
        
            <!-- Página 7: Excluir grupo -->
            <div class="tip-page" id="tipPage7" style="display: none;">
                <h2>${t_tip_pc.delete_group_title}</h2>
                <img src="/static/tips/multi_upload/delete_group.gif" alt="${t_tip_pc.delete_group_img_alt}" />
                <p>
                    ${t_tip_pc.delete_group_description}
                </p>
        
                <div class="tip-navigation">
                    <button class="tip-prev">${t_tip_pc.prev}</button>
            
                    <!-- Indicadores de página -->
                    <div class="tip-steps">
                        <span class="dot" data-step="0"></span>
                        <span class="dot" data-step="1"></span>
                        <span class="dot" data-step="2"></span>
                        <span class="dot" data-step="3"></span>
                        <span class="dot" data-step="4"></span>
                        <span class="dot" data-step="5"></span>
                        <span class="dot" data-step="6"></span>
                        <span class="dot" data-step="7"></span>
                    </div>

                    <button class="tip-next">${t_tip_pc.next}</button>
                </div>
            </div>
        
            <!-- Página 8: Excluir grupo e remover capítulos específicos -->
            <div class="tip-page" id="tipPage8" style="display: none;">
                <h2>${t_tip_pc.delete_group_remove_specific_title}</h2>
                <img src="/static/tips/multi_upload/delete_group+delete_item.gif" alt="${t_tip_pc.delete_group_remove_specific_img_alt}" />
                <p>
                    ${t_tip_pc.delete_group_remove_specific_description}
                </p>
        
                <div class="tip-navigation">
                    <button class="tip-prev">${t_tip_pc.prev}</button>
            
                    <!-- Indicadores de página -->
                    <div class="tip-steps">
                        <span class="dot" data-step="0"></span>
                        <span class="dot" data-step="1"></span>
                        <span class="dot" data-step="2"></span>
                        <span class="dot" data-step="3"></span>
                        <span class="dot" data-step="4"></span>
                        <span class="dot" data-step="5"></span>
                        <span class="dot" data-step="6"></span>
                        <span class="dot" data-step="7"></span>
                    </div>

                    <button class="tip-finish">${t_tip_pc.finish}</button>
                </div>
            </div>
        </div>
    `;
}

function updateModalTipAndroid() {
    const tipModal = document.getElementById('tipModal');
    tipModal.innerHTML = `
        <div class="tip-modal-content">
            <!-- Botão "X" para fechar -->
            <span class="tip-close">&times;</span>
            
            <!-- Página 1: Introdução -->
            <div class="tip-page" id="tipPage1">
                <h2>${t_tip_android.title}</h2>
                <p>
                    ${t_tip_android.description}
                </p>
                <p><strong>${t_tip_android.shortcuts}</strong></p>
                <ul>
                    <li>${t_tip_android.shortcut_select_all}</li>
                    <li>${t_tip_android.shortcut_select_specific}</li>
                    <li>${t_tip_android.shortcut_select_range}</li>
                </ul>
        
                <div class="tip-navigation">
                    <!-- Indicadores de página -->
                    <div class="tip-steps">
                        <span class="dot" data-step="0"></span>
                        <span class="dot" data-step="1"></span>
                        <span class="dot" data-step="2"></span>
                        <span class="dot" data-step="3"></span>
                        <span class="dot" data-step="4"></span>
                        <span class="dot" data-step="5"></span>
                        <span class="dot" data-step="6"></span>
                        <span class="dot" data-step="7"></span>
                    </div>

                    <!-- Botão "Continuar" para ir à página 2 -->
                    <button class="tip-next">${t_tip_android.next}</button>
                </div>
            </div>
        
            <!-- Página 2: Criar grupo: modo 1 -->
            <div class="tip-page" id="tipPage2" style="display: none;">
                <h2>${t_tip_android.create_group_mode_1_title}</h2>
                <img src="/static/tips/multi_upload/android_create_group_all.gif" alt="${t_tip_android.create_group_mode_1_img_alt}" />
                <p>
                    ${t_tip_android.create_group_mode_1_description}
                </p>
                </p>${t_tip_android.create_group_mode_1_tip}</p>
                <ul>
                    <li>
                        ${t_tip_android.create_group_mode_1_tip_details}
                    </li>
                </ul>
        
                <div class="tip-navigation">
                    <button class="tip-prev">${t_tip_android.prev}</button>
            
                    <!-- Indicadores de página -->
                    <div class="tip-steps">
                        <span class="dot" data-step="0"></span>
                        <span class="dot" data-step="1"></span>
                        <span class="dot" data-step="2"></span>
                        <span class="dot" data-step="3"></span>
                        <span class="dot" data-step="4"></span>
                        <span class="dot" data-step="5"></span>
                        <span class="dot" data-step="6"></span>
                        <span class="dot" data-step="7"></span>
                    </div>

                    <button class="tip-next">${t_tip_android.next}</button>
                </div>
            </div>
        
            <!-- Página 3: Criar grupo: modo 2 -->
            <div class="tip-page" id="tipPage3" style="display: none;">
                <h2>${t_tip_android.create_group_mode_2_title}</h2>
                <img src="/static/tips/multi_upload/android_create_group_simple.gif" alt="${t_tip_android.create_group_mode_2_img_alt}" />
                <p>
                    ${t_tip_android.create_group_mode_2_description}
                </p>
        
                <div class="tip-navigation">
                    <button class="tip-prev">${t_tip_android.prev}</button>
            
                    <!-- Indicadores de página -->
                    <div class="tip-steps">
                        <span class="dot" data-step="0"></span>
                        <span class="dot" data-step="1"></span>
                        <span class="dot" data-step="2"></span>
                        <span class="dot" data-step="3"></span>
                        <span class="dot" data-step="4"></span>
                        <span class="dot" data-step="5"></span>
                        <span class="dot" data-step="6"></span>
                        <span class="dot" data-step="7"></span>
                    </div>

                    <button class="tip-next">${t_tip_android.next}</button>
                </div>
            </div>
        
            <!-- Página 4: Criar grupo: modo 3 -->
            <div class="tip-page" id="tipPage4" style="display: none;">
                <h2>${t_tip_android.create_group_mode_3_title}</h2>
                <img src="/static/tips/multi_upload/android_create_group_interval.gif" alt="${t_tip_android.create_group_mode_3_img_alt}" />
                <p>
                    ${t_tip_android.create_group_mode_3_description}
                </p>
                <p>${t_tip_android.create_group_mode_3_additional_info}</p>
                <ul>
                    <li>
                        ${t_tip_android.create_group_mode_3_additional_info_details}
                    </li>
                </ul>
        
                <div class="tip-navigation">
                    <button class="tip-prev">${t_tip_android.prev}</button>
            
                    <!-- Indicadores de página -->
                    <div class="tip-steps">
                        <span class="dot" data-step="0"></span>
                        <span class="dot" data-step="1"></span>
                        <span class="dot" data-step="2"></span>
                        <span class="dot" data-step="3"></span>
                        <span class="dot" data-step="4"></span>
                        <span class="dot" data-step="5"></span>
                        <span class="dot" data-step="6"></span>
                        <span class="dot" data-step="7"></span>
                    </div>

                    <button class="tip-next">${t_tip_android.next}</button>
                </div>
            </div>
        
            <!-- Página 5: Adicionar capítulos: modo 1 -->
            <div class="tip-page" id="tipPage5" style="display: none;">
                <h2>${t_tip_android.add_chapter_mode_1_title}</h2>
                <img src="/static/tips/multi_upload/android_edit_group_add-simple.gif" alt="${t_tip_android.add_chapter_mode_1_img_alt}" />
                <p>
                    ${t_tip_android.add_chapter_mode_1_description}
                </p>
        
                <div class="tip-navigation">
                    <button class="tip-prev">${t_tip_android.prev}</button>
            
                    <!-- Indicadores de página -->
                    <div class="tip-steps">
                        <span class="dot" data-step="0"></span>
                        <span class="dot" data-step="1"></span>
                        <span class="dot" data-step="2"></span>
                        <span class="dot" data-step="3"></span>
                        <span class="dot" data-step="4"></span>
                        <span class="dot" data-step="5"></span>
                        <span class="dot" data-step="6"></span>
                        <span class="dot" data-step="7"></span>
                    </div>

                    <button class="tip-next">${t_tip_android.next}</button>
                </div>
            </div>
        
            <!-- Página 6: Adicionar capítulos: modo 2 -->
            <div class="tip-page" id="tipPage6" style="display: none;">
                <h2>${t_tip_android.add_chapter_mode_2_title}</h2>
                <img src="/static/tips/multi_upload/android_edit_group_add-interval.gif" alt="${t_tip_android.add_chapter_mode_2_img_alt}" />
                <p>
                    ${t_tip_android.add_chapter_mode_2_description}
                </p>
        
                <div class="tip-navigation">
                    <button class="tip-prev">${t_tip_android.prev}</button>
            
                    <!-- Indicadores de página -->
                    <div class="tip-steps">
                        <span class="dot" data-step="0"></span>
                        <span class="dot" data-step="1"></span>
                        <span class="dot" data-step="2"></span>
                        <span class="dot" data-step="3"></span>
                        <span class="dot" data-step="4"></span>
                        <span class="dot" data-step="5"></span>
                        <span class="dot" data-step="6"></span>
                        <span class="dot" data-step="7"></span>
                    </div>

                    <button class="tip-next">${t_tip_android.next}</button>
                </div>
            </div>
        
            <!-- Página 7: Excluir grupo -->
            <div class="tip-page" id="tipPage7" style="display: none;">
                <h2>${t_tip_android.delete_group_title}</h2>
                <img src="/static/tips/multi_upload/android_delete_group.gif" alt="${t_tip_android.delete_group_img_alt}" />
                <p>
                    ${t_tip_android.delete_group_description}
                </p>
        
                <div class="tip-navigation">
                    <button class="tip-prev">${t_tip_android.prev}</button>
            
                    <!-- Indicadores de página -->
                    <div class="tip-steps">
                        <span class="dot" data-step="0"></span>
                        <span class="dot" data-step="1"></span>
                        <span class="dot" data-step="2"></span>
                        <span class="dot" data-step="3"></span>
                        <span class="dot" data-step="4"></span>
                        <span class="dot" data-step="5"></span>
                        <span class="dot" data-step="6"></span>
                        <span class="dot" data-step="7"></span>
                    </div>

                    <button class="tip-next">${t_tip_android.next}</button>
                </div>
            </div>
        
            <!-- Página 8: Remover capítulos específicos -->
            <div class="tip-page" id="tipPage8" style="display: none;">
                <h2>${t_tip_android.delete_group_remove_specific_title}</h2>
                <img src="/static/tips/multi_upload/android_delete_group-item.gif" alt="${t_tip_android.delete_group_remove_specific_img_alt}" />
                <p>
                    ${t_tip_android.delete_group_remove_specific_description}
                </p>
        
                <div class="tip-navigation">
                    <button class="tip-prev">${t_tip_android.prev}</button>
            
                    <!-- Indicadores de página -->
                    <div class="tip-steps">
                        <span class="dot" data-step="0"></span>
                        <span class="dot" data-step="1"></span>
                        <span class="dot" data-step="2"></span>
                        <span class="dot" data-step="3"></span>
                        <span class="dot" data-step="4"></span>
                        <span class="dot" data-step="5"></span>
                        <span class="dot" data-step="6"></span>
                        <span class="dot" data-step="7"></span>
                    </div>

                    <button class="tip-finish">${t_tip_android.finish}</button>
                </div>
            </div>
        </div>
    `;
}